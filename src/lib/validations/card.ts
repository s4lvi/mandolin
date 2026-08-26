import { z } from "zod"

export const cardTypeEnum = z.enum(["VOCABULARY", "GRAMMAR", "PHRASE", "IDIOM"])

export const tagNameSchema = z.string().min(1).max(50)

export const createCardSchema = z.object({
  hanzi: z.string().min(1, "Hanzi is required").max(100),
  pinyin: z.string().min(1, "Pinyin is required").max(200),
  english: z.string().min(1, "English is required").max(500),
  notes: z.string().max(2000).optional(),
  type: cardTypeEnum.optional().default("VOCABULARY"),
  isPriority: z.boolean().optional().default(false),
  lessonId: z.string().optional(),
  tags: z.array(tagNameSchema).max(50).optional()
})

export const updateCardSchema = createCardSchema.partial()

export const bulkCreateCardsSchema = z.object({
  cards: z.array(createCardSchema).max(500),
  lessonId: z.string().optional()
})

export type CreateCardInput = z.input<typeof createCardSchema>
export type CreateCardOutput = z.output<typeof createCardSchema>
export type UpdateCardInput = z.infer<typeof updateCardSchema>
export type BulkCreateCardsInput = z.infer<typeof bulkCreateCardsSchema>
