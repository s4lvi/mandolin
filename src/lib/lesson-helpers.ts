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
