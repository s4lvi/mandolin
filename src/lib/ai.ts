import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { NextResponse } from "next/server"
import { z } from "zod"
import type { ExampleSentence } from "@/types"
import {
  GENERATE_SENTENCE_SYSTEM,
  GENERATE_SENTENCE_USER,
  TEST_QUESTION_SYSTEM,
  CLAUDE_MODEL_FAST
} from "@/lib/constants"
import { createLogger } from "@/lib/logger"
import { AppError } from "@/lib/error-handler"

const logger = createLogger("lib/ai")

// ---------------------------------------------------------------------------
// Shared client
// ---------------------------------------------------------------------------

let client: Anthropic | null = null

/** Singleton Anthropic client shared by every route (60s timeout, 2 retries). */
export function getAnthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ timeout: 60_000, maxRetries: 2 })
  }
  return client
}

/**
 * Per-request override for short Haiku calls:
 * `client.messages.parse(params, FAST_REQUEST_OPTIONS)`
 */
export const FAST_REQUEST_OPTIONS = { timeout: 15_000 } as const

/** Wrap a fixed instruction block as a cacheable system prompt. */
export function cachedSystem(text: string): Anthropic.TextBlockParam[] {
  return [{ type: "text", text, cache_control: { type: "ephemeral" } }]
}

/** Log token usage so prompt-cache hits are verifiable in debug logs. */
export function logUsage(log: ReturnType<typeof createLogger>, what: string, usage: Anthropic.Usage) {
  log.debug(`${what} usage`, {
    input: usage.input_tokens,
    output: usage.output_tokens,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0
  })
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Thrown when the model returns output that fails schema validation. Maps to a 502. */
export class AIResponseError extends AppError {
  constructor() {
    super("AI returned an unexpected response", 502, "AI_BAD_RESPONSE")
    this.name = "AIResponseError"
  }
}

/**
 * Map the SDK's typed errors to an AppError with a generic message
 * (429 for rate limits, 502 for connection/API failures). Returns null for
 * anything that isn't an Anthropic error so callers can fall through.
 */
export function mapAnthropicError(error: unknown): AppError | null {
  if (error instanceof Anthropic.RateLimitError) {
    logger.warn("Anthropic rate limited", { status: error.status, message: error.message })
    return new AppError("AI service is busy, please try again shortly", 429, "AI_RATE_LIMITED")
  }
  if (error instanceof Anthropic.APIConnectionError) {
    logger.error("Anthropic connection error", { message: error.message })
    return new AppError("AI service is unavailable", 502, "AI_UNAVAILABLE")
  }
  if (error instanceof Anthropic.APIError) {
    logger.error("Anthropic API error", { status: error.status, message: error.message })
    return new AppError("AI service returned an error", 502, "AI_ERROR")
  }
  return null
}

/** NextResponse form of mapAnthropicError for routes that build responses inline. */
export function anthropicErrorResponse(error: unknown): NextResponse | null {
  const mapped = mapAnthropicError(error)
  if (!mapped) return null
  return NextResponse.json({ error: mapped.message }, { status: mapped.statusCode })
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const exampleSentenceSchema = z.object({
  sentence: z.string().min(1),
  pinyin: z.string().min(1),
  translation: z.string().min(1)
})

const testQuestionSchema = z.object({
  questionText: z.string().min(1),
  correctAnswer: z.string().min(1),
  acceptableAnswers: z.array(z.string()),
  distractors: z.array(z.string()).min(1)
})

export interface GenerateTestQuestionParams {
  card: {
    hanzi: string
    pinyin: string
    english: string
    type: string
    notes?: string
  }
  direction: "HANZI_TO_MEANING" | "MEANING_TO_HANZI" | "PINYIN_TO_HANZI"
}

export interface TestQuestionResponse {
  questionText: string
  correctAnswer: string
  acceptableAnswers: string[]
  distractors: string[] // 12 items
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export async function generateExampleSentence(
  grammarPoint: string,
  context?: string
): Promise<ExampleSentence> {
  const userMessage = GENERATE_SENTENCE_USER
    .replace("{grammarPoint}", () => grammarPoint)
    .replace("{context}", () => context || "No additional context")

  const response = await getAnthropic().messages.parse(
    {
      model: CLAUDE_MODEL_FAST,
      max_tokens: 256,
      system: cachedSystem(GENERATE_SENTENCE_SYSTEM),
      messages: [{ role: "user", content: userMessage }],
      output_config: { format: zodOutputFormat(exampleSentenceSchema) }
    },
    FAST_REQUEST_OPTIONS
  )
  logUsage(logger, "example sentence", response.usage)

  if (!response.parsed_output) {
    logger.error("Example sentence failed to parse", { stopReason: response.stop_reason })
    throw new AIResponseError()
  }
  return response.parsed_output
}

export async function generateTestQuestion(
  params: GenerateTestQuestionParams
): Promise<TestQuestionResponse> {
  const { card, direction } = params

  const response = await getAnthropic().messages.parse(
    {
      model: CLAUDE_MODEL_FAST,
      max_tokens: 1024,
      system: cachedSystem(TEST_QUESTION_SYSTEM),
      messages: [{ role: "user", content: buildTestQuestionUserMessage(card, direction) }],
      output_config: { format: zodOutputFormat(testQuestionSchema) }
    },
    FAST_REQUEST_OPTIONS
  )
  logUsage(logger, "test question", response.usage)

  if (!response.parsed_output) {
    logger.error("Test question failed to parse", { stopReason: response.stop_reason })
    throw new AIResponseError()
  }
  return response.parsed_output
}

function buildTestQuestionUserMessage(
  card: GenerateTestQuestionParams["card"],
  direction: GenerateTestQuestionParams["direction"]
): string {
  return `Flashcard:
- Hanzi (Chinese): ${card.hanzi}
- Pinyin: ${card.pinyin}
- English: ${card.english}
- Type: ${card.type}
${card.notes ? `- Notes: ${card.notes}\n` : ""}
Direction: ${direction}`
}
