// SM-2 Spaced Repetition Algorithm Implementation

export enum Quality {
  AGAIN = 0, // Complete blackout, wrong answer
  HARD = 1,  // Correct but with difficulty
  GOOD = 2,  // Correct with some hesitation
  EASY = 3   // Perfect, instant recall
}

export interface SRSCard {
  easeFactor: number
  interval: number
  repetitions: number
  state: "NEW" | "LEARNING" | "REVIEW" | "LEARNED"
}

export interface SRSResult {
  easeFactor: number
  interval: number
  repetitions: number
  state: "NEW" | "LEARNING" | "REVIEW" | "LEARNED"
  nextReview: Date
}

// Threshold for considering a card "learned"
const LEARNED_THRESHOLD = 5 // consecutive correct answers

// Calculate the next review based on SM-2 algorithm
export function calculateSRS(card: SRSCard, quality: Quality): SRSResult {
  let { easeFactor, interval, repetitions, state } = card

  if (quality >= Quality.GOOD) {
    // Correct response
    repetitions += 1

    if (repetitions === 1) {
      interval = 1
    } else if (repetitions === 2) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }

    // Update ease factor based on quality
    // EF' = EF + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))
    const qualityFactor = quality === Quality.EASY ? 3 : 2
    easeFactor = easeFactor + (0.1 - (3 - qualityFactor) * (0.08 + (3 - qualityFactor) * 0.02))

    // Ease factor should not go below 1.3
    if (easeFactor < 1.3) {
      easeFactor = 1.3
    }

    // Bonus for EASY responses
    if (quality === Quality.EASY) {
      interval = Math.round(interval * 1.3)
    }

    // Update state
    if (repetitions >= LEARNED_THRESHOLD) {
      state = "LEARNED"
    } else if (repetitions >= 1) {
      state = "REVIEW"
    }
  } else {
    // Incorrect response (AGAIN or HARD)
    repetitions = 0
    interval = 1
    state = "LEARNING"

    // Reduce ease factor for wrong answers
    if (quality === Quality.AGAIN) {
      easeFactor = Math.max(1.3, easeFactor - 0.2)
    } else {
      // HARD - still correct but difficult
      easeFactor = Math.max(1.3, easeFactor - 0.15)
      repetitions = 1 // Don't fully reset
      interval = Math.max(1, Math.round(interval * 0.5))
    }
  }

  // Calculate next review date
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  return {
    easeFactor,
    interval,
    repetitions,
    state,
    nextReview
  }
}

// Calculate XP earned from a review
export function calculateXP(quality: Quality, isStreak: boolean, cardState: string): number {
  let xp = 0

  // Base XP based on quality
  switch (quality) {
    case Quality.AGAIN:
      xp = 1 // Still get something for trying
      break
    case Quality.HARD:
      xp = 5
      break
    case Quality.GOOD:
      xp = 10
      break
    case Quality.EASY:
      xp = 15
      break
  }

  // Bonus for maintaining streak
  if (isStreak && quality >= Quality.GOOD) {
    xp += 5
  }

  // Bonus for learning new cards
  if (cardState === "NEW" && quality >= Quality.GOOD) {
    xp += 10
  }

  // Bonus for mastering cards (reaching LEARNED state)
  if (cardState === "REVIEW" && quality >= Quality.GOOD) {
    xp += 2
  }

  return xp
}

// Calculate level from total XP
export function calculateLevel(totalXp: number): number {
  // Level formula: level = floor(sqrt(xp / 100)) + 1
  // XP needed per level: 100, 400, 900, 1600, 2500...
  return Math.floor(Math.sqrt(totalXp / 100)) + 1
}

// Calculate XP needed for next level
export function xpForNextLevel(currentLevel: number): number {
  return currentLevel * currentLevel * 100
}

// Calculate XP progress within current level
export function xpProgressInLevel(totalXp: number): { current: number; needed: number; percentage: number } {
  const level = calculateLevel(totalXp)
  const xpForCurrentLevel = (level - 1) * (level - 1) * 100
  const xpForNext = level * level * 100
  const current = totalXp - xpForCurrentLevel
  const needed = xpForNext - xpForCurrentLevel

  return {
    current,
    needed,
    percentage: Math.round((current / needed) * 100)
  }
}

// Check if dates are on the same day
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Check if dates are consecutive days
export function isConsecutiveDay(lastDate: Date, currentDate: Date): boolean {
  const last = new Date(lastDate)
  last.setDate(last.getDate() + 1)
  return isSameDay(last, currentDate)
}

// Get quality label for display
export function getQualityLabel(quality: Quality): string {
  switch (quality) {
    case Quality.AGAIN:
      return "Again"
    case Quality.HARD:
      return "Hard"
    case Quality.GOOD:
      return "Good"
    case Quality.EASY:
      return "Easy"
  }
}

// Get quality color for display
export function getQualityColor(quality: Quality): string {
  switch (quality) {
    case Quality.AGAIN:
      return "text-red-500"
    case Quality.HARD:
      return "text-orange-500"
    case Quality.GOOD:
      return "text-green-500"
    case Quality.EASY:
      return "text-blue-500"
  }
}
