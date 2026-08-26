// SM-2 Spaced Repetition Algorithm Implementation

import { isSameLocalDay, isConsecutiveLocalDay } from "@/lib/dates"

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
  const prevInterval = Math.max(0, interval)

  if (quality >= Quality.GOOD) {
    // Correct response
    repetitions += 1

    if (repetitions === 1) {
      // First success (fresh card or relearning after a lapse). A card that
      // previously had a mature interval restarts at half of it, not 1 day.
      interval = Math.max(1, prevInterval > 1 ? Math.round(prevInterval * 0.5) : 1)
    } else if (repetitions === 2) {
      interval = Math.max(6, Math.round(prevInterval * easeFactor))
    } else {
      interval = Math.round(prevInterval * easeFactor)
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
  } else if (quality === Quality.HARD) {
    // Correct but difficult: shrink the interval, keep progress, dock ease
    interval = Math.max(1, Math.round(prevInterval * 0.5))
    easeFactor = Math.max(1.3, easeFactor - 0.15)
    if (state === "NEW") {
      state = "LEARNING"
    }
  } else {
    // AGAIN (lapse): relearn from scratch tomorrow
    repetitions = 0
    interval = 1
    state = "LEARNING"
    easeFactor = Math.max(1.3, easeFactor - 0.2)
  }

  interval = Math.max(1, interval)

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

// Check if dates are on the same calendar day (in the given IANA zone, default UTC)
export function isSameDay(date1: Date, date2: Date, timeZone: string = "UTC"): boolean {
  return isSameLocalDay(date1, date2, timeZone)
}

// Check if dates are consecutive calendar days (in the given IANA zone, default UTC)
export function isConsecutiveDay(lastDate: Date, currentDate: Date, timeZone: string = "UTC"): boolean {
  return isConsecutiveLocalDay(lastDate, currentDate, timeZone)
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

// Preview the interval that would result from a given quality rating
export function previewInterval(card: SRSCard, quality: Quality): number {
  return calculateSRS(card, quality).interval
}

// Format an interval as a human-readable string
export function formatInterval(days: number): string {
  if (days < 1) return "<1d"
  if (days === 1) return "1d"
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
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
