import { z } from "zod"
import { REVIEW_DEFAULTS } from "@/lib/constants/review"

export const reviewModeSchema = z.enum(["classic", "recall", "listening", "test"])
export const faceModeSchema = z.enum(["hanzi", "pinyin", "both", "english", "immersion", "random"])
export const testDirectionSchema = z.enum(["HANZI_TO_MEANING", "MEANING_TO_HANZI", "PINYIN_TO_HANZI"])

/** Persisted defaults for the review session. All optional so partial updates merge. */
export const reviewPrefsSchema = z.object({
  reviewMode: reviewModeSchema.default("classic"),
  faceMode: faceModeSchema.default("hanzi"),
  testDirection: testDirectionSchema.default("HANZI_TO_MEANING"),
  cardLimit: z
    .number()
    .int()
    .min(REVIEW_DEFAULTS.MIN_CARD_LIMIT)
    .max(REVIEW_DEFAULTS.MAX_CARD_LIMIT)
    .default(REVIEW_DEFAULTS.DEFAULT_CARD_LIMIT),
  includeAllCards: z.boolean().default(false),
  selectedTags: z.array(z.string().max(50)).max(50).default([]),
  selectedTypes: z.array(z.string().max(30)).max(10).default([]),
  /** Show the Hard button on mobile as well as desktop */
  showHardButton: z.boolean().default(true),
  /** Auto-play hanzi audio when a card is shown (never when the front face is English) */
  autoPlayAudio: z.boolean().default(true),
  /** Max new (never-reviewed) cards to introduce per session */
  newCardsPerSession: z.number().int().min(0).max(50).default(6)
})

export type ReviewPrefs = z.infer<typeof reviewPrefsSchema>

export const DEFAULT_REVIEW_PREFS: ReviewPrefs = reviewPrefsSchema.parse({})

export const updatePreferencesSchema = z.object({
  reviewPrefs: reviewPrefsSchema.partial().optional(),
  dailyGoal: z.number().int().min(1).max(500).optional()
})

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>

export interface PreferencesResponse {
  reviewPrefs: ReviewPrefs
  dailyGoal: number
  timezone: string | null
}
