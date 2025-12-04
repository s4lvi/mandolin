import type { Card, CardState } from "@prisma/client"

/**
 * Calculate lesson progress based on card states
 */
export interface LessonProgress {
  new: number
  learning: number
  review: number
  learned: number
  total: number
  masteryPercentage: number
}

export function calculateLessonProgress(cards: Pick<Card, "state">[]): LessonProgress {
  const progress = {
    new: 0,
    learning: 0,
    review: 0,
    learned: 0,
    total: cards.length,
    masteryPercentage: 0
  }

  cards.forEach((card) => {
    switch (card.state) {
      case "NEW":
        progress.new++
        break
      case "LEARNING":
        progress.learning++
        break
      case "REVIEW":
        progress.review++
        break
      case "LEARNED":
        progress.learned++
        break
    }
  })

  // Calculate mastery percentage (learned / total * 100)
  if (progress.total > 0) {
    progress.masteryPercentage = Math.round((progress.learned / progress.total) * 100)
  }

  return progress
}

/**
 * Find cards related to the given card within a lesson
 * Used in narrative mode to show context when user answers incorrectly
 */
export interface RelatedCard {
  id: string
  hanzi: string
  pinyin: string
  english: string
  type: string
  tags: Array<{ tag: { name: string } }>
}

export function getRelatedCards(
  currentCard: RelatedCard,
  lessonCards: RelatedCard[],
  limit: number = 5
): RelatedCard[] {
  // Don't include the current card itself
  const otherCards = lessonCards.filter((c) => c.id !== currentCard.id)

  // Calculate relevance score for each card
  const scoredCards = otherCards.map((card) => {
    let score = 0

    // Same type (VOCABULARY, GRAMMAR, etc.)
    if (card.type === currentCard.type) {
      score += 2
    }

    // Shared tags
    const currentTags = new Set(currentCard.tags.map((t) => t.tag.name))
    const sharedTags = card.tags.filter((t) => currentTags.has(t.tag.name))
    score += sharedTags.length * 3

    // Similar pinyin patterns (first syllable)
    const currentFirstSyllable = currentCard.pinyin.split(" ")[0]
    const cardFirstSyllable = card.pinyin.split(" ")[0]
    if (currentFirstSyllable === cardFirstSyllable) {
      score += 1
    }

    // Check if card is mentioned in current card's english/notes
    const currentText = `${currentCard.english} ${currentCard.hanzi}`.toLowerCase()
    const cardText = `${card.english} ${card.hanzi}`.toLowerCase()
    if (currentText.includes(cardText) || cardText.includes(currentText)) {
      score += 2
    }

    return { card, score }
  })

  // Sort by score (descending) and return top N
  return scoredCards
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.card)
}

/**
 * Get next available lesson number
 */
export function getNextLessonNumber(existingLessons?: Array<{ number: number }> | null): number {
  if (!existingLessons || !Array.isArray(existingLessons) || existingLessons.length === 0) {
    return 1
  }

  const maxNumber = Math.max(...existingLessons.map((l) => l.number))
  return maxNumber + 1
}

/**
 * Format lesson title for display
 */
export function formatLessonTitle(
  number: number,
  title?: string | null
): string {
  if (title) {
    return `Lesson ${number}: ${title}`
  }
  return `Lesson ${number}`
}

/**
 * Estimate time to master lesson based on card count and current progress
 * Returns estimated minutes
 */
export function estimateLessonTime(progress: LessonProgress): number {
  // Average time per card: 2 minutes for new cards, 1 minute for reviews
  const newCardTime = progress.new * 2
  const learningCardTime = progress.learning * 1.5
  const reviewCardTime = progress.review * 1

  return Math.round(newCardTime + learningCardTime + reviewCardTime)
}

/**
 * Check if lesson is complete (all cards learned)
 */
export function isLessonComplete(progress: LessonProgress): boolean {
  return progress.total > 0 && progress.learned === progress.total
}

/**
 * Get lesson completion status label
 */
export function getLessonStatusLabel(progress: LessonProgress): string {
  if (progress.total === 0) {
    return "Empty"
  }

  if (isLessonComplete(progress)) {
    return "Mastered"
  }

  if (progress.new === progress.total) {
    return "Not Started"
  }

  return "In Progress"
}

/**
 * Sort cards for narrative mode (for sequential learning)
 * Uses SRS algorithm but maintains some order
 * Note: Accepts both Prisma Card objects (with Date) and API Card objects (with string dates)
 */
export function sortCardsForNarrativeMode<
  T extends {
    state: CardState
    nextReview?: Date | string | null
    easeFactor: number
    createdAt: Date | string
  }
>(cards: T[]): T[] {
  return [...cards].sort((a, b) => {
    // Priority 1: State (NEW → LEARNING → REVIEW → LEARNED)
    const stateOrder: Record<CardState, number> = {
      NEW: 0,
      LEARNING: 1,
      REVIEW: 2,
      LEARNED: 3
    }

    if (stateOrder[a.state] !== stateOrder[b.state]) {
      return stateOrder[a.state] - stateOrder[b.state]
    }

    // Priority 2: Due cards first (if in LEARNING or REVIEW state)
    if (a.state !== "NEW" && b.state !== "NEW") {
      const now = new Date()
      const aNextReview = a.nextReview ? (typeof a.nextReview === 'string' ? new Date(a.nextReview) : a.nextReview) : null
      const bNextReview = b.nextReview ? (typeof b.nextReview === 'string' ? new Date(b.nextReview) : b.nextReview) : null
      const aDue = aNextReview ? aNextReview <= now : true
      const bDue = bNextReview ? bNextReview <= now : true

      if (aDue !== bDue) {
        return aDue ? -1 : 1
      }
    }

    // Priority 3: Ease factor (harder cards first)
    if (a.state !== "NEW" && b.state !== "NEW") {
      return a.easeFactor - b.easeFactor
    }

    // Priority 4: Creation date (maintain upload order for NEW cards)
    const aCreatedAt = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt
    const bCreatedAt = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt
    return aCreatedAt.getTime() - bCreatedAt.getTime()
  })
}
