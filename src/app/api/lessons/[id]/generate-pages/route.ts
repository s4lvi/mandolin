import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/auth-options"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { LESSON_PAGE_GENERATION_PROMPT } from "@/lib/constants"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

interface SegmentResponse {
  type: string
  content: Record<string, unknown>
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const lessonId = params.id

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

    // Generate pages in parallel
    const totalPages = 10
    const lessonContext = lesson.notes || "No lesson context provided"
    const cardList = lesson.cards
      .map(
        (card) => `${card.hanzi} (${card.pinyin}): ${card.english}${card.notes ? ` - ${card.notes}` : ""}`
      )
      .join("\n")

    // Generate all pages in parallel
    const pageGenerationPromises = Array.from(
      { length: totalPages },
      (_, i) => generatePage(i + 1, totalPages, lessonContext, cardList)
    )

    const generatedPages = await Promise.all(pageGenerationPromises)

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
                type: segment.type,
                content: segment.content
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
        types: page.segments.map((s) => s.type)
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

  // Parse JSON response
  const segments = JSON.parse(content.text) as SegmentResponse[]

  return { segments }
}
