import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { createLogger } from "@/lib/logger"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"
import { CLAUDE_MODEL, MERGE_CONTEXT_PROMPT } from "@/lib/constants"
import { stripMarkdownCodeBlock } from "@/lib/api-helpers"

const logger = createLogger("api/cards/save-parsed")
const anthropic = new Anthropic()

const cardSchema = z.object({
  hanzi: z.string(),
  pinyin: z.string(),
  english: z.string(),
  notes: z.string().optional(),
  type: z.enum(["VOCABULARY", "GRAMMAR", "PHRASE", "IDIOM"]).default("VOCABULARY"),
  tags: z.array(z.string()).optional()
})

const saveParsedSchema = z.object({
  cards: z.array(cardSchema),
  duplicateHanzi: z.array(z.string()).default([]),
  lessonMode: z.enum(["new", "existing", "none"]),
  lessonNumber: z.number().optional(),
  lessonTitle: z.string().optional(),
  lessonContext: z.string().optional(),
  existingLessonId: z.string().optional()
})

// POST /api/cards/save-parsed
// Handles the entire save flow server-side so the client can navigate away safely:
// 1. Create/update lesson
// 2. Bulk create new cards
// 3. Associate duplicate cards with lesson
// 4. Merge lesson context (if existing lesson)
export async function POST(req: Request) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const body = await req.json()
    const data = saveParsedSchema.parse(body)

    let lessonId: string | undefined

    // Step 1: Handle lesson creation or selection
    if (data.lessonMode === "new" && data.lessonNumber) {
      const lesson = await prisma.lesson.create({
        data: {
          number: data.lessonNumber,
          title: data.lessonTitle || undefined,
          notes: data.lessonContext || undefined,
          deckId: deck.id
        }
      })
      lessonId = lesson.id
      logger.info("Created lesson", { lessonId, number: data.lessonNumber })
    } else if (data.lessonMode === "existing" && data.existingLessonId) {
      lessonId = data.existingLessonId

      // Merge context in background (non-blocking for the card save)
      if (data.lessonContext) {
        mergeContextAsync(lessonId, data.lessonContext, deck.id)
      }
    }

    // Step 2: Get existing cards for duplicate detection
    const existingCards = await prisma.card.findMany({
      where: { deckId: deck.id },
      select: { hanzi: true, id: true }
    })
    const existingHanziMap = new Map(existingCards.map(c => [c.hanzi, c.id]))

    // Step 3: Separate new cards from duplicates
    const cardsToCreate = data.cards.filter(c => !existingHanziMap.has(c.hanzi))

    // Step 4: Collect and batch-create tags
    const allTagNames = new Set<string>()
    for (const card of cardsToCreate) {
      card.tags?.forEach(t => allTagNames.add(t))
    }

    const tagMap = new Map<string, string>()
    if (allTagNames.size > 0) {
      const tagNamesArray = Array.from(allTagNames)
      const existingTags = await prisma.tag.findMany({
        where: { name: { in: tagNamesArray } }
      })
      const existingTagNames = new Set(existingTags.map(t => t.name))

      const newTagNames = tagNamesArray.filter(n => !existingTagNames.has(n))
      if (newTagNames.length > 0) {
        await prisma.tag.createMany({
          data: newTagNames.map(name => ({ name })),
          skipDuplicates: true
        })
      }

      const allTags = await prisma.tag.findMany({
        where: { name: { in: tagNamesArray } }
      })
      allTags.forEach(t => tagMap.set(t.name, t.id))
    }

    // Step 5: Bulk create cards in transaction
    let createdCount = 0
    if (cardsToCreate.length > 0) {
      const created = await prisma.$transaction(
        cardsToCreate.map(cardData =>
          prisma.card.create({
            data: {
              hanzi: cardData.hanzi,
              pinyin: cardData.pinyin,
              english: cardData.english,
              notes: cardData.notes,
              type: cardData.type,
              lessonId,
              deckId: deck.id,
              tags: cardData.tags
                ? {
                    create: cardData.tags.map(tagName => ({
                      tagId: tagMap.get(tagName)!
                    }))
                  }
                : undefined
            }
          })
        )
      )
      createdCount = created.length
    }

    // Step 6: Associate duplicate cards with lesson
    let associatedCount = 0
    if (lessonId && data.duplicateHanzi.length > 0) {
      const dupeCardIds = data.duplicateHanzi
        .map(h => existingHanziMap.get(h))
        .filter((id): id is string => !!id)

      if (dupeCardIds.length > 0) {
        const result = await prisma.card.updateMany({
          where: {
            id: { in: dupeCardIds },
            deckId: deck.id,
            lessonId: null // Only associate unassociated cards
          },
          data: { lessonId }
        })
        associatedCount = result.count
      }
    }

    logger.info("Saved parsed cards", {
      deckId: deck.id,
      created: createdCount,
      associated: associatedCount,
      lessonId
    })

    return NextResponse.json({
      created: createdCount,
      associated: associatedCount,
      lessonId
    })
  } catch (error) {
    logger.error("Failed to save parsed cards", { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save cards" },
      { status: 500 }
    )
  }
}

// Merge lesson context asynchronously — runs after response is sent
async function mergeContextAsync(lessonId: string, newContext: string, deckId: string) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { notes: true }
    })

    if (!lesson?.notes) {
      await prisma.lesson.update({
        where: { id: lessonId },
        data: { notes: newContext }
      })
      return
    }

    // Use AI to merge contexts
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `${MERGE_CONTEXT_PROMPT}\n\nExisting context:\n${lesson.notes}\n\nNew context:\n${newContext}`
      }]
    })

    const content = response.content[0]
    if (content.type === "text") {
      const merged = stripMarkdownCodeBlock(content.text)
      await prisma.lesson.update({
        where: { id: lessonId },
        data: { notes: merged }
      })
    }
  } catch (error) {
    // Log but don't fail — context merge is best-effort
    console.error("Background context merge failed:", error)
    // Fallback: append
    try {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { notes: true }
      })
      await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          notes: lesson?.notes
            ? `${lesson.notes}\n\n---\n\n${newContext}`
            : newContext
        }
      })
    } catch {
      // Give up
    }
  }
}
