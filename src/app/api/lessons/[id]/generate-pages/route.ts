import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { SegmentType, Prisma } from "@prisma/client"
import { getAuthenticatedUserDeck, stripMarkdownCodeBlock } from "@/lib/api-helpers"
import { CLAUDE_MODEL, LESSON_TOTAL_PAGES } from "@/lib/constants"
import { aiPagesResponseSchema } from "@/lib/validations/lesson"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

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
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const { id: lessonId } = await params

    // Fetch lesson with cards (verify ownership through deck)
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deckId: deck.id
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

    // Check for regenerate flag
    const { searchParams } = new URL(req.url)
    const regenerate = searchParams.get("regenerate") === "true"

    // Check if pages already exist
    const existingPages = await prisma.lessonPage.findMany({
      where: { lessonId },
      include: {
        segments: {
          orderBy: { orderIndex: "asc" }
        }
      },
      orderBy: { pageNumber: "asc" }
    })

    // If pages exist and complete, return them unless regenerate requested
    if (existingPages.length >= LESSON_TOTAL_PAGES && !regenerate) {
      return NextResponse.json({
        lessonId,
        totalPages: existingPages.length,
        pages: existingPages.map((page) => ({
          pageNumber: page.pageNumber,
          segmentCount: page.segments.length,
          types: page.segments.map((s) => s.type)
        }))
      })
    }

    // Always delete existing pages before generating new ones (use transaction for safety)
    await prisma.$transaction(async (tx) => {
      // Delete segments first (in case cascade isn't working)
      await tx.pageSegment.deleteMany({
        where: {
          page: { lessonId }
        }
      })
      // Then delete pages
      await tx.lessonPage.deleteMany({
        where: { lessonId }
      })
    })

    // Build the prompt
    const lessonContext = lesson.notes || "No lesson context provided"
    const cardList = lesson.cards
      .map(
        (card) => `${card.hanzi} (${card.pinyin}): ${card.english}${card.notes ? ` - ${card.notes}` : ""}`
      )
      .join("\n")

    const prompt = ALL_PAGES_PROMPT
      .replace("{LESSON_CONTEXT}", lessonContext)
      .replace("{CARD_LIST}", cardList)
      .replace("{TOTAL_PAGES}", String(LESSON_TOTAL_PAGES))

    // Use streaming to generate all pages in one API call
    let fullResponse = ""

    const stream = await anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
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

    // Parse and validate the AI response
    const jsonText = stripMarkdownCodeBlock(fullResponse)
    const rawParsed = JSON.parse(jsonText)
    const parsed = aiPagesResponseSchema.parse(rawParsed)

    // Deduplicate pages by pageNumber (keep first occurrence)
    const seenPageNumbers = new Set<number>()
    const uniquePages = parsed.pages.filter((page) => {
      if (seenPageNumbers.has(page.pageNumber)) {
        return false
      }
      seenPageNumbers.add(page.pageNumber)
      return true
    })

    // Save all pages to database sequentially to avoid race conditions
    const savedPages = []
    for (const pageData of uniquePages) {
      const page = await prisma.lessonPage.create({
        data: {
          lessonId,
          pageNumber: pageData.pageNumber,
          segments: {
            create: pageData.segments.map((segment, segmentIndex) => ({
              orderIndex: segmentIndex,
              type: segment.type as SegmentType,
              content: segment.content as Prisma.InputJsonValue
            }))
          }
        },
        include: {
          segments: {
            orderBy: { orderIndex: "asc" }
          }
        }
      })
      savedPages.push(page)
    }

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
