import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { PREDEFINED_TAGS, CLAUDE_MODEL_FAST } from "@/lib/constants"
import {
  getAnthropic,
  FAST_REQUEST_OPTIONS,
  cachedSystem,
  logUsage,
  anthropicErrorResponse
} from "@/lib/ai"
import { rateLimited, RATE_LIMITS } from "@/lib/rate-limit"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api/autofill-card")

// Structured outputs require an object at the top level, so wrap the values
const tagsResponseSchema = z.object({ tags: z.array(z.string()) })
const typeResponseSchema = z.object({
  type: z.enum(["VOCABULARY", "GRAMMAR", "PHRASE", "IDIOM"])
})

function badAiResponse(details: unknown) {
  logger.error("AI returned an unexpected response", details)
  return NextResponse.json({ error: "AI returned an unexpected response" }, { status: 502 })
}

const autofillSchema = z.object({
  field: z.enum(["hanzi", "pinyin", "english", "notes", "type", "tags"]),
  context: z.object({
    hanzi: z.string().optional(),
    pinyin: z.string().optional(),
    english: z.string().optional(),
    notes: z.string().optional(),
    type: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
})

// Fixed instructions per field — sent as a (cacheable) system prompt; only the
// card context goes in the user message.
const AUTOFILL_PROMPTS: Record<string, string> = {
  hanzi: `Given the context about a Mandarin Chinese word/phrase, provide the Chinese characters (hanzi).
Return ONLY the hanzi, nothing else.`,

  pinyin: `Given the context about a Mandarin Chinese word/phrase, provide the pinyin with proper tone marks.
Use tone marks (ā, á, ǎ, à, etc.), NOT tone numbers.
Return ONLY the pinyin, nothing else.`,

  english: `Given the context about a Mandarin Chinese word/phrase, provide a clear English translation/definition.
Return ONLY the translation, nothing else.`,

  notes: `Given the context about a Mandarin Chinese word/phrase, provide helpful study notes.
Include usage tips, grammar notes, or contextual information.
Keep it concise (1-2 sentences).
Return ONLY the notes, nothing else.`,

  type: `Given the context about a Mandarin Chinese word/phrase, determine its type.
- VOCABULARY: Single words or common 2-character compounds
- GRAMMAR: Grammar patterns or structures
- PHRASE: Common expressions or greetings
- IDIOM: Chinese idioms (成语) or proverbs`,

  tags: `Given the context about a Mandarin Chinese word/phrase, suggest 2-4 relevant tags.
Choose ONLY from these allowed tags:
${PREDEFINED_TAGS.join(", ")}`
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const limited = rateLimited(`ai:light:${session.user.id}`, RATE_LIMITS.AI_LIGHT)
    if (limited) return limited

    const body = await req.json()
    const { field, context } = autofillSchema.parse(body)

    // Build context string
    const contextParts: string[] = []
    if (context.hanzi) contextParts.push(`Hanzi: ${context.hanzi}`)
    if (context.pinyin) contextParts.push(`Pinyin: ${context.pinyin}`)
    if (context.english) contextParts.push(`English: ${context.english}`)
    if (context.notes) contextParts.push(`Notes: ${context.notes}`)
    if (context.type) contextParts.push(`Type: ${context.type}`)
    if (context.tags && context.tags.length > 0) {
      contextParts.push(`Tags: ${context.tags.join(", ")}`)
    }

    if (contextParts.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one field as context" },
        { status: 400 }
      )
    }

    const anthropic = getAnthropic()
    const base = {
      model: CLAUDE_MODEL_FAST,
      max_tokens: 256,
      system: cachedSystem(AUTOFILL_PROMPTS[field]),
      messages: [{ role: "user" as const, content: `Context:\n${contextParts.join("\n")}` }]
    }

    if (field === "tags") {
      const response = await anthropic.messages.parse(
        { ...base, output_config: { format: zodOutputFormat(tagsResponseSchema) } },
        FAST_REQUEST_OPTIONS
      )
      logUsage(logger, `autofill ${field}`, response.usage)
      if (!response.parsed_output) {
        return badAiResponse({ field, stopReason: response.stop_reason })
      }
      // Filter to only allowed tags
      const allowed = new Set<string>(PREDEFINED_TAGS)
      const validTags = response.parsed_output.tags.filter((tag) => allowed.has(tag))
      return NextResponse.json({ value: validTags })
    }

    if (field === "type") {
      const response = await anthropic.messages.parse(
        { ...base, output_config: { format: zodOutputFormat(typeResponseSchema) } },
        FAST_REQUEST_OPTIONS
      )
      logUsage(logger, `autofill ${field}`, response.usage)
      if (!response.parsed_output) {
        return badAiResponse({ field, stopReason: response.stop_reason })
      }
      return NextResponse.json({ value: response.parsed_output.type })
    }

    // Free-text fields
    const response = await anthropic.messages.create(base, FAST_REQUEST_OPTIONS)
    logUsage(logger, `autofill ${field}`, response.usage)

    const content = response.content[0]
    if (!content || content.type !== "text") {
      return badAiResponse({ field, stopReason: response.stop_reason })
    }

    const result = content.text.trim()
    if (!result) {
      return badAiResponse({ field, text: "" })
    }

    return NextResponse.json({ value: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    const aiError = anthropicErrorResponse(error)
    if (aiError) return aiError
    logger.error("Error autofilling card", { error })
    return NextResponse.json(
      { error: "Failed to autofill card" },
      { status: 500 }
    )
  }
}
