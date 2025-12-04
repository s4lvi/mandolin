/**
 * Centralized API response type definitions
 * Single source of truth for API contracts between frontend and backend
 */

import type { Card, CardType } from "@/types"

/**
 * User statistics and progress
 */
export interface UserStats {
  totalXp: number
  level: number
  currentStreak: number
  longestStreak: number
  totalReviews: number
  totalCorrect: number
  dailyGoal: number
  dailyProgress: number
}

/**
 * Tag information
 */
export interface Tag {
  id: string
  name: string
  category?: string
}

/**
 * Achievement data
 */
export interface Achievement {
  id: string
  key: string
  name: string
  description: string
  icon: string
  requirement: number
  xpReward: number
}

/**
 * Minimal achievement info (used in responses)
 */
export interface AchievementInfo {
  name: string
  icon: string
  xpReward: number
}

/**
 * Spaced repetition system result
 */
export interface SRSResult {
  nextReview: string
  interval: number
  state: string
}

/**
 * Review session endpoints
 */

export interface FetchReviewCardsParams {
  limit?: number
  lessonId?: string
  types?: string[]
  allCards?: boolean
  tagIds?: string[]
}

export interface ReviewResponse {
  cards: Card[]
  userStats: UserStats | null
  dueCount: number
  totalCards: number
  availableTags: Tag[]
}

export interface SubmitReviewRequest {
  cardId: string
  quality: number
}

export interface ReviewResult {
  card: Card
  stats: UserStats
  xpEarned: number
  newAchievements: AchievementInfo[]
  srsResult: SRSResult
}

/**
 * Card endpoints
 */

export interface CardStatsResponse {
  total: number
  new: number
  learning: number
  review: number
  learned: number
  dueToday: number
}

/**
 * Stats endpoint
 */

export interface StatsResponse {
  stats: UserStats
  cardStats: CardStatsResponse
}

/**
 * Generate sentence endpoint
 */

export interface GenerateSentenceRequest {
  cardId: string
}

export interface GenerateSentenceResponse {
  sentence: string
  pinyin: string
  translation: string
}

/**
 * Upload/parse notes endpoint
 */

export interface ParseNotesRequest {
  notes: string
  lessonNumber?: number
  lessonTitle?: string
  lessonMode?: "new" | "existing" | "none"
  selectedLessonId?: string
}

export interface ParseNotesResponse {
  cards: Array<{
    hanzi: string
    pinyin: string
    english: string
    notes?: string
    type: CardType
    suggestedTags: string[]
    isDuplicate: boolean
  }>
  lessonContext?: string
  lessonNumber?: number
  lessonTitle?: string
  lessonMode?: "new" | "existing" | "none"
  selectedLessonId?: string
  totalParsed: number
  duplicatesFound: number
}

/**
 * Bulk card creation
 */

export interface CreateCardInput {
  hanzi: string
  pinyin: string
  english: string
  notes?: string
  type?: CardType
  tags?: string[]
  lessonId?: string
}

export interface CreateCardsBulkRequest {
  cards: CreateCardInput[]
  lessonId?: string
}

export interface CreateCardsBulkResponse {
  cards: Card[]
  cardIds: string[] // IDs of created cards for lesson association
  duplicates: string[]
  created: number
  skipped: number
}

/**
 * Test question endpoints
 */

export interface TestQuestion {
  id: string
  cardId: string
  direction: string
  questionText: string
  correctAnswer: string
  acceptableAnswers: string[]
  distractors: string[]
  timesUsed: number
  generatedAt: string
}

export interface TestQuestionRequest {
  cardId: string
  direction: string
}

export interface TestQuestionResponse {
  cached: boolean
  question: TestQuestion
}

export interface PrefetchTestQuestionsRequest {
  cardIds: string[]
  direction: string
}

/**
 * Changelog/versioning endpoints
 */

export interface Changelog {
  id: string
  version: string
  title: string
  changes: string[]
  releaseDate: string  // ISO date string
  createdAt: string    // ISO date string
}

export interface ChangelogResponse {
  changelog: Changelog | null
}
