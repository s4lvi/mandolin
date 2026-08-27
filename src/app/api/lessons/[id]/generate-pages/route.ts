import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { SegmentType, Prisma } from "@prisma/client"
import { getAuthenticatedUserDeck, stripMarkdownCodeBlock } from "@/lib/api-helpers"
import { CLAUDE_MODEL, LESSON_TOTAL_PAGES } from "@/lib/constants"
import { aiPagesResponseSchema, pageResponseSchema } from "@/lib/validations/lesson"
import { z } from "zod"
import { rateLimited, RATE_LIMITS } from "@/lib/rate-limit"

const anthropic = new Anthropic({ timeout: 60_000, maxRetries: 2 })

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

    const limited = rateLimited(`ai:heavy:${deck.userId}`, RATE_LIMITS.AI_HEAVY)
    if (limited) return limited

    const { id: lessonId } = await params

    // Fetch lesson with cards (verify ownership through deck)
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deckId: deck.id
      },
      include: {
        cards: {
          include: { card: true },
          orderBy: { order: "asc" }
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

    // If pages exist (complete or partial), return them unless regenerate
    // requested. Partial sets are kept rather than regenerated so progress isn't
    // invalidated. `stale` tells the client the card set changed since generation.
    if (!regenerate && existingPages.length > 0) {
      return NextResponse.json({
        lessonId,
        totalPages: existingPages.length,
        stale: lesson.pagesStale,
        pages: existingPages.map((page) => ({
          pageNumber: page.pageNumber,
          segmentCount: page.segments.length,
          types: page.segments.map((s) => s.type)
        }))
      })
    }

    // If regenerate requested, delete all existing pages and the user's progress
    // for them (the saved page/segment responses no longer refer to anything)
    if (regenerate && existingPages.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.pageSegment.deleteMany({
          where: { page: { lessonId } }
        })
        await tx.lessonPage.deleteMany({
          where: { lessonId }
        })
        await tx.lessonProgress.deleteMany({
          where: { lessonId, userId: deck.userId }
        })
      })
    }

    // Build the prompt
    const lessonContext = lesson.notes || "No lesson context provided"
    const cardList = lesson.cards
      .map((cl) => cl.card)
      .map(
        (card) => `${card.hanzi} (${card.pinyin}): ${card.english}${card.notes ? ` - ${card.notes}` : ""}`
      )
      .join("\n")

    const prompt = ALL_PAGES_PROMPT
      .replace("{LESSON_CONTEXT}", () => lessonContext)
      .replace("{CARD_LIST}", () => cardList)
      .replace("{TOTAL_PAGES}", () => String(LESSON_TOTAL_PAGES))

    // Use streaming to generate all pages in one API call
    let fullResponse = ""

    const stream = await anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      thinking: { type: "disabled" },
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
    let rawParsed
    try {
      rawParsed = JSON.parse(jsonText)
    } catch {
      // Try to extract JSON from the response
      const firstBrace = jsonText.indexOf("{")
      const lastBrace = jsonText.lastIndexOf("}")
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        rawParsed = JSON.parse(jsonText.substring(firstBrace, lastBrace + 1))
      } else {
        console.error("AI response was not valid JSON:", fullResponse.slice(0, 500))
        return NextResponse.json(
          { error: "AI returned an unexpected response" },
          { status: 502 }
        )
      }
    }

    let parsed
    const strict = aiPagesResponseSchema.safeParse(rawParsed)
    if (strict.success) {
      parsed = strict.data
    } else {
      // Salvage: validate pages individually and keep only the well-formed ones,
      // rather than forwarding unvalidated data into the database.
      console.error("AI response failed schema validation:", strict.error)
      const candidatePages = Array.isArray(rawParsed?.pages) ? rawParsed.pages : []
      const validPages = candidatePages
        .map((p: unknown) => pageResponseSchema.safeParse(p))
        .filter((r: { success: boolean }) => r.success)
        .map((r: { data: unknown }) => r.data) as z.infer<typeof pageResponseSchema>[]

      if (validPages.length === 0) {
        return NextResponse.json(
          { error: "AI returned an unexpected response" },
          { status: 502 }
        )
      }
      parsed = { pages: validPages }
    }

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

    // Freshly generated pages reflect the current card set
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { pagesStale: false }
    })

    return NextResponse.json({
      lessonId,
      totalPages: savedPages.length,
      stale: false,
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
