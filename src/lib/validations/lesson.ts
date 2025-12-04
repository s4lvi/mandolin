import { z } from "zod"

// Segment type enum matching Prisma schema
export const segmentTypeEnum = z.enum([
  "TEXT",
  "FLASHCARD",
  "MULTIPLE_CHOICE",
  "FILL_IN",
  "TRANSLATION_EN_ZH",
  "TRANSLATION_ZH_EN",
  "FEEDBACK"
])

// Content schemas for each segment type
export const textContentSchema = z.object({
  title: z.string().optional(),
  text: z.string()
})

export const flashcardContentSchema = z.object({
  hanzi: z.string(),
  pinyin: z.string(),
  english: z.string(),
  notes: z.string().optional()
})

export const multipleChoiceContentSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string()
})

export const fillInContentSchema = z.object({
  sentence: z.string(),
  correctAnswer: z.string(),
  pinyin: z.string(),
  translation: z.string(),
  hint: z.string().optional()
})

export const translationContentSchema = z.object({
  sourceText: z.string(),
  acceptableTranslations: z.array(z.string()).min(1),
  hint: z.string().optional()
})

export const feedbackContentSchema = z.object({
  userAnswer: z.string(),
  correctAnswer: z.string(),
  explanation: z.string(),
  encouragement: z.string()
})

// Union type for segment content based on type
export const segmentContentSchema = z.union([
  textContentSchema,
  flashcardContentSchema,
  multipleChoiceContentSchema,
  fillInContentSchema,
  translationContentSchema,
  feedbackContentSchema
])

// Segment schema from AI response
export const segmentResponseSchema = z.object({
  type: segmentTypeEnum,
  content: z.record(z.string(), z.unknown()) // Will be validated based on type
})

// Page schema from AI response
export const pageResponseSchema = z.object({
  pageNumber: z.number().int().positive(),
  segments: z.array(segmentResponseSchema).min(1).max(4)
})

// Full AI response for page generation
export const aiPagesResponseSchema = z.object({
  pages: z.array(pageResponseSchema)
})

// AI evaluation response schema
export const aiEvaluationResponseSchema = z.object({
  isCorrect: z.boolean(),
  explanation: z.string(),
  correctAnswer: z.string(),
  encouragement: z.string()
})

// Request body schemas
export const evaluateRequestSchema = z.object({
  segmentId: z.string(),
  segmentType: segmentTypeEnum,
  userAnswer: z.string(),
  sourceText: z.string().optional(),
  acceptableTranslations: z.array(z.string()).optional(),
  correctAnswer: z.string().optional()
})

export const progressRequestSchema = z.object({
  lessonId: z.string(),
  currentPage: z.number().int().positive(),
  totalPages: z.number().int().positive(),
  responses: z.array(z.unknown()).optional()
})

// Type exports
export type SegmentType = z.infer<typeof segmentTypeEnum>
export type SegmentResponse = z.infer<typeof segmentResponseSchema>
export type PageResponse = z.infer<typeof pageResponseSchema>
export type AIPagesResponse = z.infer<typeof aiPagesResponseSchema>
export type AIEvaluationResponse = z.infer<typeof aiEvaluationResponseSchema>
export type EvaluateRequest = z.infer<typeof evaluateRequestSchema>
export type ProgressRequest = z.infer<typeof progressRequestSchema>

// Content type exports
export type TextContent = z.infer<typeof textContentSchema>
export type FlashcardContent = z.infer<typeof flashcardContentSchema>
export type MultipleChoiceContent = z.infer<typeof multipleChoiceContentSchema>
export type FillInContent = z.infer<typeof fillInContentSchema>
export type TranslationContent = z.infer<typeof translationContentSchema>
export type FeedbackContent = z.infer<typeof feedbackContentSchema>
