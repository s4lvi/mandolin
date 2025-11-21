/**
 * Review and session-related constants
 */

export const REVIEW_DEFAULTS = {
  /** Default number of cards to fetch per review session */
  DEFAULT_CARD_LIMIT: 20,
  /** Maximum cards that can be reviewed in one session */
  MAX_CARD_LIMIT: 100,
  /** Minimum cards for a review session */
  MIN_CARD_LIMIT: 1,
  /** Number of test question distractors to generate */
  MULTIPLE_CHOICE_DISTRACTORS: 12,
  /** Number of distractors to show in multiple choice (selected from total) */
  MULTIPLE_CHOICE_SELECTED: 3,
  /** Number of cards to prefetch ahead during test mode */
  PREFETCH_AHEAD: 3
} as const

/**
 * Spaced Repetition System (SM-2 algorithm) constants
 */
export const SRS_DEFAULTS = {
  /** Initial ease factor for new cards */
  INITIAL_EASE_FACTOR: 2.5,
  /** Minimum ease factor a card can have */
  MIN_EASE_FACTOR: 1.3,
  /** Number of successful reviews before card is considered "learned" */
  LEARNED_THRESHOLD: 5,
  /** Initial interval for new cards (in days) */
  INITIAL_INTERVAL: 1,
  /** Ease factor adjustment for "hard" rating */
  HARD_EASE_ADJUSTMENT: -0.15,
  /** Ease factor adjustment for "easy" rating */
  EASY_EASE_ADJUSTMENT: 0.15
} as const

/**
 * Experience points (XP) for different review outcomes
 */
export const XP_VALUES = {
  /** Base XP for each quality rating */
  BASE: {
    /** Failed - card needs to be reviewed again */
    AGAIN: 1,
    /** Hard - card was difficult */
    HARD: 5,
    /** Good - card was correctly recalled */
    GOOD: 10,
    /** Easy - card was very easy to recall */
    EASY: 15
  },
  /** Bonus XP for maintaining a streak */
  STREAK_BONUS: 5,
  /** Bonus XP for first time reviewing a new card successfully */
  NEW_CARD_BONUS: 10,
  /** Bonus XP for reviewing a card (in addition to base XP) */
  REVIEW_BONUS: 2
} as const

/**
 * User stats and achievement constants
 */
export const STATS_DEFAULTS = {
  /** Default daily goal for card reviews */
  DEFAULT_DAILY_GOAL: 20,
  /** Minimum daily goal */
  MIN_DAILY_GOAL: 5,
  /** Maximum daily goal */
  MAX_DAILY_GOAL: 100
} as const

/**
 * Deck and card management constants
 */
export const DECK_DEFAULTS = {
  /** Number of cards to display per page in deck view */
  CARDS_PER_PAGE: 12
} as const
