import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import {
  getAuthenticatedUserDeck,
  verifyLessonOwnership,
  stripMarkdownCodeBlock
} from "@/lib/api-helpers"
import { createLogger } from "@/lib/logger"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"
import { CLAUDE_MODEL, MERGE_CONTEXT_PROMPT } from "@/lib/constants"

const logger = createLogger("api/cards/save-parsed")
const anthropic = new Anthropic({ timeout: 60_000, maxRetries: 2 })

const cardSchema = z.object({
  hanzi: z.string().min(1).max(100),
  pinyin: z.string().max(200),
  english: z.string().max(500),
  notes: z.string().max(2000).optional(),
  type: z.enum(["VOCABULARY", "GRAMMAR", "PHRASE", "IDIOM"]).default("VOCABULARY"),
  tags: z.array(z.string().min(1).max(50)).max(50).optional()
})

const saveParsedSchema = z.object({
  cards: z.array(cardSchema).max(500),
  duplicateHanzi: z.array(z.string().max(100)).max(500).default([]),
  lessonMode: z.enum(["new", "existing", "none"]),
  lessonNumber: z.number().int().positive().optional(),
  lessonTitle: z.string().max(200).optional(),
  lessonContext: z.string().max(20000).optional(),
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

    // Step 1: Validate the target lesson up front (before any writes)
    let existingLessonId: string | undefined
    if (data.lessonMode === "existing" && data.existingLessonId) {
      const owned = await verifyLessonOwnership(data.existingLessonId, deck.id)
      if (!owned) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
      }
      existingLessonId = data.existingLessonId
    }
    const createNewLesson = data.lessonMode === "new" && !!data.lessonNumber

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

    const dupeCardIds = data.duplicateHanzi
      .map(h => existingHanziMap.get(h))
      .filter((id): id is string => !!id)

    // Step 5: Create lesson (if requested), cards, and lesson links atomically so a
    // failed import never leaves behind an empty lesson or partial card set
    const { lessonId, createdCount, associatedCount } = await prisma.$transaction(
      async (tx) => {
        let lessonId = existingLessonId

        if (createNewLesson) {
          const lesson = await tx.lesson.create({
            data: {
              number: data.lessonNumber!,
              title: data.lessonTitle || undefined,
              notes: data.lessonContext || undefined,
              deckId: deck.id
            }
          })
          lessonId = lesson.id
        }

        let createdCount = 0
        for (const cardData of cardsToCreate) {
          await tx.card.create({
            data: {
              hanzi: cardData.hanzi,
              pinyin: cardData.pinyin,
              english: cardData.english,
              notes: cardData.notes,
              type: cardData.type,
              deckId: deck.id,
              lessons: lessonId ? { create: { lessonId } } : undefined,
              tags: cardData.tags
                ? {
                    create: cardData.tags.map(tagName => ({
                      tagId: tagMap.get(tagName)!
                    }))
                  }
                : undefined
            }
          })
          createdCount++
        }

        // Step 6: Associate duplicate cards with lesson (no-op if already linked)
        let associatedCount = 0
        if (lessonId && dupeCardIds.length > 0) {
          const result = await tx.cardLesson.createMany({
            data: dupeCardIds.map((cardId) => ({ cardId, lessonId: lessonId! })),
            skipDuplicates: true
          })
          associatedCount = result.count
        }

        return { lessonId, createdCount, associatedCount }
      },
      { timeout: 30000 }
    )

    if (createNewLesson) {
      logger.info("Created lesson", { lessonId, number: data.lessonNumber })
    }

    // Merge context in background (non-blocking for the card save)
    if (existingLessonId && data.lessonContext) {
      mergeContextAsync(existingLessonId, data.lessonContext)
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Lesson number already in use. Choose a different number." },
        { status: 409 }
      )
    }
    logger.error("Failed to save parsed cards", { error })
    return NextResponse.json({ error: "Failed to save cards" }, { status: 500 })
  }
}

// Merge lesson context asynchronously — runs after response is sent
async function mergeContextAsync(lessonId: string, newContext: string) {
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
    logger.error("Background context merge failed", { lessonId, error })
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
