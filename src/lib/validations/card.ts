import { z } from "zod"

export const cardTypeEnum = z.enum(["VOCABULARY", "GRAMMAR", "PHRASE", "IDIOM"])

export const createCardSchema = z.object({
  hanzi: z.string().min(1, "Hanzi is required"),
  pinyin: z.string().min(1, "Pinyin is required"),
  english: z.string().min(1, "English is required"),
  notes: z.string().optional(),
  type: cardTypeEnum.optional().default("VOCABULARY"),
  isPriority: z.boolean().optional().default(false),
  lessonId: z.string().optional(),
  tags: z.array(z.string()).optional()
})

export const updateCardSchema = createCardSchema.partial()

export const bulkCreateCardsSchema = z.object({
  cards: z.array(createCardSchema),
  lessonId: z.string().optional()
})

export type CreateCardInput = z.input<typeof createCardSchema>
export type CreateCardOutput = z.output<typeof createCardSchema>
export type UpdateCardInput = z.infer<typeof updateCardSchema>
export type BulkCreateCardsInput = z.infer<typeof bulkCreateCardsSchema>
