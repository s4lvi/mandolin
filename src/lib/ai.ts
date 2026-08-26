import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import type { ExampleSentence } from "@/types"
import { GENERATE_SENTENCE_PROMPT, CLAUDE_MODEL_FAST } from "@/lib/constants"
import { createLogger } from "@/lib/logger"
import { AppError } from "@/lib/error-handler"

const logger = createLogger("lib/ai")
const anthropic = new Anthropic({ timeout: 60_000, maxRetries: 2 })

/** Thrown when the model returns output that fails schema validation. Maps to a 502. */
export class AIResponseError extends AppError {
  constructor() {
    super("AI returned an unexpected response", 502, "AI_BAD_RESPONSE")
    this.name = "AIResponseError"
  }
}

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

function extractJson(text: string): string {
  let jsonText = text.trim()
  // If wrapped in code blocks, extract the JSON
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }
  return jsonText
}

/** Parse + validate model JSON; logs details and throws AIResponseError on failure. */
function parseModelJson<T>(schema: z.ZodType<T>, text: string, what: string): T {
  let raw: unknown
  try {
    raw = JSON.parse(extractJson(text))
  } catch (error) {
    logger.error(`Failed to parse ${what} JSON`, { error, text: text.slice(0, 500) })
    throw new AIResponseError()
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    logger.error(`${what} failed schema validation`, { issues: result.error.issues, text: text.slice(0, 500) })
    throw new AIResponseError()
  }
  return result.data
}

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

export async function generateExampleSentence(
  grammarPoint: string,
  context?: string
): Promise<ExampleSentence> {
  const prompt = GENERATE_SENTENCE_PROMPT
    .replace("{grammarPoint}", () => grammarPoint)
    .replace("{context}", () => context || "No additional context")

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL_FAST,
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  })

  const content = response.content[0]
  if (content.type !== "text") {
    throw new Error("Unexpected response type")
  }

  return parseModelJson(exampleSentenceSchema, content.text, "example sentence")
}

export async function generateTestQuestion(
  params: GenerateTestQuestionParams
): Promise<TestQuestionResponse> {
  const { card, direction } = params

  const prompt = buildTestQuestionPrompt(card, direction)

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL_FAST,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  })

  const content = response.content[0]
  if (content.type !== "text") {
    throw new Error("Unexpected response type")
  }

  return parseModelJson(testQuestionSchema, content.text, "test question")
}

function buildTestQuestionPrompt(
  card: { hanzi: string; pinyin: string; english: string; type: string; notes?: string },
  direction: "HANZI_TO_MEANING" | "MEANING_TO_HANZI" | "PINYIN_TO_HANZI"
): string {
  const directionInstructions = {
    HANZI_TO_MEANING: `
      Show the Chinese characters (hanzi) and pinyin.
      Ask the user to provide the English meaning.
      Question example: "What does ${card.hanzi} (${card.pinyin}) mean?"
      Correct answer: "${card.english}"

      IMPORTANT: All distractors must be in ENGLISH only (no Chinese characters or pinyin).
      Distractors should be plausible English translations that are similar in meaning or context.
    `,
    MEANING_TO_HANZI: `
      Show the English meaning.
      Ask the user to provide the Chinese characters (hanzi).
      Question example: "How do you write '${card.english}' in Chinese characters?"
      Correct answer: "${card.hanzi}"

      IMPORTANT: All distractors must be in CHINESE CHARACTERS (hanzi) only (no English or pinyin).
      Distractors should be real Chinese characters with similar meaning or pronunciation.
    `,
    PINYIN_TO_HANZI: `
      Show only the pinyin romanization.
      Ask the user to provide the Chinese characters (hanzi).
      Question example: "What are the Chinese characters for '${card.pinyin}'?"
      Correct answer: "${card.hanzi}"

      IMPORTANT: All distractors must be in CHINESE CHARACTERS (hanzi) only (no English or pinyin).
      Distractors should be real Chinese characters with similar pronunciation or appearance.
    `
  }

  return `You are helping create test questions for a Mandarin Chinese learning app.

Given this flashcard:
- Hanzi (Chinese): ${card.hanzi}
- Pinyin: ${card.pinyin}
- English: ${card.english}
- Type: ${card.type}
${card.notes ? `- Notes: ${card.notes}` : ''}

Create a test question for: ${direction}
${directionInstructions[direction]}

Please generate:

1. **questionText**: A clear, natural question asking the user to provide the answer
2. **correctAnswer**: The primary correct answer (single string)
3. **acceptableAnswers**: 3-5 variations that should be accepted as correct (for text input validation)
   - Include common variations, abbreviations, alternative translations
   - For pinyin: include with/without tone marks, different tone number formats
   - For English: include synonyms, slight variations in wording
4. **distractors**: Exactly 12 plausible but INCORRECT answers for multiple choice
   - Should be at similar difficulty level
   - Should be contextually related (same topic, similar structure)
   - Should be tempting wrong answers (common mistakes, similar-sounding words)
   - For Chinese characters: use real characters, not gibberish
   - Ensure variety in the distractors

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "questionText": "your question here",
  "correctAnswer": "primary answer",
  "acceptableAnswers": ["variation1", "variation2", "variation3"],
  "distractors": ["wrong1", "wrong2", "wrong3", "wrong4", "wrong5", "wrong6", "wrong7", "wrong8", "wrong9", "wrong10", "wrong11", "wrong12"]
}`
}
