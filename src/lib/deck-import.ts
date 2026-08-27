import { Prisma, CardType, LessonSourceType, Lesson } from "@prisma/client"

/**
 * A normalized card template used when importing cards into a user's deck
 * (from a course lesson or a published community lesson). Tags are flattened
 * to plain names so both sources can share the same import path.
 */
export interface ImportCardTemplate {
  hanzi: string
  pinyin: string
  english: string
  notes?: string | null
  type: CardType
  tags: string[]
}

export interface CopyCardsResult {
  lesson: Lesson
  created: number
  duplicates: number
}

/**
 * Create a new lesson in the user's deck and copy a set of card templates into it.
 *
 * Cards whose hanzi already exists in the deck are treated as duplicates: instead
 * of creating a second copy, an existing card that isn't yet attached to a lesson
 * is associated with the new lesson so the lesson is never silently empty.
 *
 * MUST be called inside a `prisma.$transaction` so the next-lesson-number read,
 * the duplicate check, and the writes are atomic — otherwise concurrent imports
 * can collide on the `@@unique([deckId, number])` constraint.
 */
export async function copyCardsToDeck(
  tx: Prisma.TransactionClient,
  deckId: string,
  cards: ImportCardTemplate[],
  meta: { title: string | null; notes?: string | null; sourceType: LessonSourceType }
): Promise<CopyCardsResult> {
  // Next available lesson number (read inside the tx for race safety)
  const maxLesson = await tx.lesson.findFirst({
    where: { deckId },
    orderBy: { number: "desc" },
    select: { number: true }
  })
  const lessonNumber = (maxLesson?.number ?? 0) + 1

  // Existing cards in the deck, to detect duplicates by hanzi
  const existingCards = await tx.card.findMany({
    where: { deckId },
    select: { hanzi: true, id: true }
  })
  const existingByHanzi = new Map(existingCards.map((c) => [c.hanzi, c.id]))

  const newCards = cards.filter((c) => !existingByHanzi.has(c.hanzi))
  // Cards already in the deck get linked to this lesson (multi-membership)
  const duplicateCardIds = cards
    .map((c) => existingByHanzi.get(c.hanzi))
    .filter((id): id is string => !!id)

  // Ensure all tags referenced by the new cards exist, then map name -> id
  const tagNames = Array.from(new Set(newCards.flatMap((c) => c.tags)))
  const tagMap = new Map<string, string>()
  if (tagNames.length > 0) {
    await tx.tag.createMany({
      data: tagNames.map((name) => ({ name })),
      skipDuplicates: true
    })
    const tags = await tx.tag.findMany({ where: { name: { in: tagNames } } })
    tags.forEach((t) => tagMap.set(t.name, t.id))
  }

  const lesson = await tx.lesson.create({
    data: {
      number: lessonNumber,
      title: meta.title,
      notes: meta.notes ?? null,
      sourceType: meta.sourceType,
      deckId
    }
  })

  for (const card of newCards) {
    const tagIds = card.tags.map((t) => tagMap.get(t)).filter((id): id is string => !!id)
    await tx.card.create({
      data: {
        hanzi: card.hanzi,
        pinyin: card.pinyin,
        english: card.english,
        notes: card.notes ?? null,
        type: card.type as CardType,
        deckId,
        lessons: { create: { lessonId: lesson.id } },
        tags: tagIds.length > 0 ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined
      }
    })
  }

  // Link pre-existing duplicates to this lesson (skip if already linked)
  if (duplicateCardIds.length > 0) {
    await tx.cardLesson.createMany({
      data: duplicateCardIds.map((cardId) => ({ cardId, lessonId: lesson.id })),
      skipDuplicates: true
    })
  }

  return {
    lesson,
    created: newCards.length,
    duplicates: cards.length - newCards.length
  }
}

/**
 * Flag lessons whose card set just changed so their generated interactive pages
 * are known to be out of date. Only lessons that already have pages are flagged
 * (a lesson with no pages has nothing to go stale). Safe to call with an empty
 * list. Works with either the base client or a transaction client.
 */
export async function markLessonPagesStale(
  client: Prisma.TransactionClient | { lesson: Prisma.TransactionClient["lesson"] },
  lessonIds: string[]
): Promise<void> {
  const ids = Array.from(new Set(lessonIds.filter(Boolean)))
  if (ids.length === 0) return
  await client.lesson.updateMany({
    where: { id: { in: ids }, pages: { some: {} } },
    data: { pagesStale: true }
  })
}
