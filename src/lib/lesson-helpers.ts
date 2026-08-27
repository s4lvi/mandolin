export type LessonSource = "USER_CREATED" | "COURSE" | "COMMUNITY"

/** True for lessons the user made themselves (not imported from a course/community). */
export function isUserCreatedLesson(lesson: { sourceType?: string | null }): boolean {
  return !lesson.sourceType || lesson.sourceType === "USER_CREATED"
}

/** Short display label for an imported lesson's origin, or null for user-created ones. */
export function lessonSourceLabel(lesson: { sourceType?: string | null }): "Course" | "Community" | null {
  if (lesson.sourceType === "COURSE") return "Course"
  if (lesson.sourceType === "COMMUNITY") return "Community"
  return null
}

/**
 * Get the next available lesson number for a *user-created* lesson.
 *
 * Only USER_CREATED lessons count toward the default so imported course and
 * community lessons (which take high numbers) don't push the user's own
 * numbering around. Imports themselves use the max over all lessons (see
 * `copyCardsToDeck`), so uniqueness still holds.
 */
export function getNextLessonNumber(
  existingLessons?: Array<{ number: number; sourceType?: string | null }> | null
): number {
  if (!existingLessons || !Array.isArray(existingLessons)) return 1
  const own = existingLessons.filter(isUserCreatedLesson)
  if (own.length === 0) return 1
  return Math.max(...own.map((l) => l.number)) + 1
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
