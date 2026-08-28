import prisma from "@/lib/prisma"
import { generateTestQuestion } from "@/lib/ai"
import { createLogger } from "@/lib/logger"

const logger = createLogger("lib/test-question-prefetch")

export type TestDirection = "HANZI_TO_MEANING" | "MEANING_TO_HANZI" | "PINYIN_TO_HANZI"
export const TEST_DIRECTIONS: TestDirection[] = ["HANZI_TO_MEANING", "MEANING_TO_HANZI", "PINYIN_TO_HANZI"]

/** Max cards accepted per prefetch call (caps background AI spend per session start). */
export const MAX_PREFETCH_CARDS = 100

/** Max concurrent Claude calls per prefetch batch. */
const CONCURRENCY = 4

/**
 * (cardId, direction) pairs currently being generated, in this process. Both the
 * per-card POST /api/test-questions route and the background prefetch consult this
 * so a card is never generated twice at once.
 */
const inFlight = new Set<string>()

function key(cardId: string, direction: TestDirection): string {
  return `${cardId}:${direction}`
}

export function isTestQuestionInFlight(cardId: string, direction: TestDirection): boolean {
  return inFlight.has(key(cardId, direction))
}

/** Tiny p-limit: run `tasks` with at most `limit` in flight at once. */
async function runLimited(tasks: Array<() => Promise<void>>, limit: number): Promise<void> {
  let next = 0
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next++]
      await task()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
}

/**
 * Generate and cache one test question. Skips (and returns null) when the same
 * (cardId, direction) is already being generated elsewhere in this process.
 * Uses the same upsert as the per-card route so races with it are harmless.
 */
export async function generateAndCacheTestQuestion(
  card: { id: string; hanzi: string; pinyin: string; english: string; type: string; notes: string | null },
  direction: TestDirection
) {
  const k = key(card.id, direction)
  if (inFlight.has(k)) return null
  inFlight.add(k)
  try {
    const generated = await generateTestQuestion({
      card: {
        hanzi: card.hanzi,
        pinyin: card.pinyin,
        english: card.english,
        type: card.type,
        notes: card.notes || undefined
      },
      direction
    })
    return await prisma.testQuestion.upsert({
      where: { cardId_direction: { cardId: card.id, direction } },
      update: {},
      create: {
        cardId: card.id,
        direction,
        questionText: generated.questionText,
        correctAnswer: generated.correctAnswer,
        acceptableAnswers: generated.acceptableAnswers,
        distractors: generated.distractors,
        timesUsed: 0
      }
    })
  } finally {
    inFlight.delete(k)
  }
}

/**
 * Background prefetch: generate cached TestQuestions for every card in `cardIds`
 * (owned by `userId`) that does not yet have one for `direction`. Fire-and-forget;
 * never throws. Returns once the batch settles (callers typically do not await).
 */
export async function prefetchTestQuestions(
  cardIds: string[],
  direction: TestDirection,
  userId: string
): Promise<void> {
  const ids = Array.from(new Set(cardIds)).slice(0, MAX_PREFETCH_CARDS)
  if (ids.length === 0) return

  try {
    const cards = await prisma.card.findMany({
      where: {
        id: { in: ids },
        deck: { userId },
        testQuestions: { none: { direction } }
      },
      select: { id: true, hanzi: true, pinyin: true, english: true, type: true, notes: true }
    })

    const pending = cards.filter((c) => !isTestQuestionInFlight(c.id, direction))
    if (pending.length === 0) {
      logger.debug("Test question prefetch: nothing to do", { userId, direction, requested: ids.length })
      return
    }

    logger.info("Test question prefetch started", { userId, direction, count: pending.length })
    const started = Date.now()
    let generated = 0
    let failed = 0

    await runLimited(
      pending.map((card) => async () => {
        try {
          const result = await generateAndCacheTestQuestion(card, direction)
          if (result) generated++
        } catch (error) {
          failed++
          logger.error("Test question prefetch failed for card", { error, userId, cardId: card.id, direction })
        }
      }),
      CONCURRENCY
    )

    logger.info("Test question prefetch finished", {
      userId,
      direction,
      generated,
      failed,
      durationMs: Date.now() - started
    })
  } catch (error) {
    logger.error("Test question prefetch failed", { error, userId, direction })
  }
}
