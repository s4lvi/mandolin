import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { SegmentType } from "@prisma/client"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

interface SegmentResponse {
  type: string
  content: Record<string, unknown>
}

interface PageResponse {
  pageNumber: number
  segments: SegmentResponse[]
}

// Prompt that generates all pages in a single request
const ALL_PAGES_PROMPT = `You are creating an interactive Chinese language lesson with multiple pages.

**Lesson Context:**
{LESSON_CONTEXT}

**Cards in Lesson:**
{CARD_LIST}

**Task:** Generate {TOTAL_PAGES} lesson pages. Each page should have 2-4 educational segments.

**Segment Types:**
- TEXT: Explain concept (1 paragraph max, 2-4 sentences)
- FLASHCARD: Highlight key vocabulary (hanzi, pinyin, english, optional notes)
- MULTIPLE_CHOICE: Test comprehension (question, 4 options, correctIndex 0-3, explanation)
- FILL_IN: Complete sentence (sentence with ___, correctAnswer, pinyin, translation, hint)
- TRANSLATION_EN_ZH: English to Chinese (sourceText, acceptableTranslations array, hint)
- TRANSLATION_ZH_EN: Chinese to English (sourceText, acceptableTranslations array, hint)

**Progressive Difficulty:**
- Pages 1-2: Introduce vocabulary with TEXT and FLASHCARD segments
- Pages 3-4: Practice with MULTIPLE_CHOICE and FILL_IN questions
- Page 5: Complex TRANSLATION exercises and cultural notes

**Response Format:**
Return a JSON object with a "pages" array. Each page has "pageNumber" and "segments" array.

Example structure:
{
  "pages": [
    {
      "pageNumber": 1,
      "segments": [
        { "type": "TEXT", "content": { "title": "Welcome", "text": "..." } },
        { "type": "FLASHCARD", "content": { "hanzi": "...", "pinyin": "...", "english": "..." } }
      ]
    }
  ]
}

Return ONLY valid JSON. No markdown, no explanation.`

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

    // Build the prompt
    const totalPages = 5
    const lessonContext = lesson.notes || "No lesson context provided"
    const cardList = lesson.cards
      .map(
        (card) => `${card.hanzi} (${card.pinyin}): ${card.english}${card.notes ? ` - ${card.notes}` : ""}`
      )
      .join("\n")

    const prompt = ALL_PAGES_PROMPT
      .replace("{LESSON_CONTEXT}", lessonContext)
      .replace("{CARD_LIST}", cardList)
      .replace("{TOTAL_PAGES}", String(totalPages))

    // Use streaming to generate all pages in one API call
    let fullResponse = ""

    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000, // More tokens for all pages
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })

    // Collect the full streamed response
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text
      }
    }

    // Parse the complete response
    let jsonText = fullResponse.trim()

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

    const parsed = JSON.parse(jsonText) as { pages: PageResponse[] }

    // Save all pages to database
    const savedPages = await Promise.all(
      parsed.pages.map(async (pageData) => {
        const page = await prisma.lessonPage.create({
          data: {
            lessonId,
            pageNumber: pageData.pageNumber,
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
