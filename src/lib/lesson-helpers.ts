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
 * Compute a course completion percentage (0-100, rounded).
 */
export function courseProgress(completed: number, total: number): number {
  if (!total || total <= 0) return 0
  return Math.round((completed / total) * 100)
}
