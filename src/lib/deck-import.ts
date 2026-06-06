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
    select: { hanzi: true, id: true, lessonId: true }
  })
  const existingByHanzi = new Map(existingCards.map((c) => [c.hanzi, c]))

  const newCards = cards.filter((c) => !existingByHanzi.has(c.hanzi))
  const duplicateCardIds = cards
    .map((c) => existingByHanzi.get(c.hanzi))
    .filter((c): c is { hanzi: string; id: string; lessonId: string | null } => !!c)
    // Only re-home cards that don't already belong to a lesson
    .filter((c) => c.lessonId === null)
    .map((c) => c.id)

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
        lessonId: lesson.id,
        tags: tagIds.length > 0 ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined
      }
    })
  }

  // Attach pre-existing, lesson-less duplicates to this lesson
  if (duplicateCardIds.length > 0) {
    await tx.card.updateMany({
      where: { id: { in: duplicateCardIds }, lessonId: null },
      data: { lessonId: lesson.id }
    })
  }

  return {
    lesson,
    created: newCards.length,
    duplicates: cards.length - newCards.length
  }
}
