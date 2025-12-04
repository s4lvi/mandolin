import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { LESSON_PAGE_GENERATION_PROMPT } from "@/lib/constants"
import { SegmentType } from "@prisma/client"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

interface SegmentResponse {
  type: string
  content: Record<string, unknown>
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: lessonId } = await params

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch lesson with cards
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deck: { userId: user.id }
      },
      include: {
        cards: {
          orderBy: { createdAt: "asc" }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    if (!lesson.cards || lesson.cards.length === 0) {
      return NextResponse.json(
        { error: "Lesson has no cards" },
        { status: 400 }
      )
    }

    // Check if pages already exist
    const existingPages = await prisma.lessonPage.count({
      where: { lessonId }
    })

    if (existingPages > 0) {
      // Return existing pages structure
      const pages = await prisma.lessonPage.findMany({
        where: { lessonId },
        include: {
          segments: {
            orderBy: { orderIndex: "asc" }
          }
        },
        orderBy: { pageNumber: "asc" }
      })

      return NextResponse.json({
        lessonId,
        totalPages: pages.length,
        pages: pages.map((page) => ({
          pageNumber: page.pageNumber,
          segmentCount: page.segments.length,
          types: page.segments.map((s) => s.type)
        }))
      })
    }

    // Generate pages sequentially to avoid rate limits
    const totalPages = 5 // Reduced from 10 to stay within rate limits
    const lessonContext = lesson.notes || "No lesson context provided"
    const cardList = lesson.cards
      .map(
        (card) => `${card.hanzi} (${card.pinyin}): ${card.english}${card.notes ? ` - ${card.notes}` : ""}`
      )
      .join("\n")

    // Generate pages sequentially with delays to avoid rate limits
    const generatedPages: { segments: SegmentResponse[] }[] = []
    for (let i = 0; i < totalPages; i++) {
      const pageData = await generatePage(i + 1, totalPages, lessonContext, cardList)
      generatedPages.push(pageData)
      // Small delay between requests to avoid rate limiting
      if (i < totalPages - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // Save all pages to database
    const savedPages = await Promise.all(
      generatedPages.map(async (pageData, index) => {
        const page = await prisma.lessonPage.create({
          data: {
            lessonId,
            pageNumber: index + 1,
            segments: {
              create: pageData.segments.map((segment, segmentIndex) => ({
                orderIndex: segmentIndex,
                type: segment.type as SegmentType,
                content: segment.content as any
              }))
            }
          },
          include: {
            segments: {
              orderBy: { orderIndex: "asc" }
            }
          }
        })

        return page
      })
    )

    return NextResponse.json({
      lessonId,
      totalPages: savedPages.length,
      pages: savedPages.map((page) => ({
        pageNumber: page.pageNumber,
        segmentCount: page.segments.length,
        types: page.segments.map((s: any) => s.type)
      }))
    })
  } catch (error) {
    console.error("Error generating lesson pages:", error)
    return NextResponse.json(
      { error: "Failed to generate lesson pages" },
      { status: 500 }
    )
  }
}

async function generatePage(
  pageNumber: number,
  totalPages: number,
  lessonContext: string,
  cardList: string
): Promise<{ segments: SegmentResponse[] }> {
  const prompt = LESSON_PAGE_GENERATION_PROMPT.replace(
    "{LESSON_CONTEXT}",
    lessonContext
  )
    .replace("{CARD_LIST}", cardList)
    .replace("{PAGE_NUMBER}", String(pageNumber))
    .replace("{TOTAL_PAGES}", String(totalPages))

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  })

  const content = message.content[0]
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude")
  }

  // Parse JSON response - strip markdown code blocks if present
  let jsonText = content.text.trim()

  // Remove markdown code blocks if present
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7)
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3)
  }

  if (jsonText.endsWith("```")) {
    jsonText = jsonText.slice(0, -3)
  }

  jsonText = jsonText.trim()

  const segments = JSON.parse(jsonText) as SegmentResponse[]

  return { segments }
}
