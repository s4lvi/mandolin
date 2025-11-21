import Anthropic from "@anthropic-ai/sdk"
import type { ParsedCard, ExampleSentence } from "@/types"
import { PARSE_NOTES_PROMPT, GENERATE_SENTENCE_PROMPT } from "@/lib/constants"

const anthropic = new Anthropic()

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

export async function parseNotes(notes: string): Promise<ParsedCard[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 16384,
    messages: [
      {
        role: "user",
        content: `${PARSE_NOTES_PROMPT}\n\nLesson Notes:\n${notes}`
      }
    ]
  })

  const content = response.content[0]
  if (content.type !== "text") {
    throw new Error("Unexpected response type")
  }

  // Check if response was truncated
  if (response.stop_reason === "max_tokens") {
    console.error("AI response was truncated due to max_tokens limit")
    throw new Error("Response was too long and got truncated. Try with shorter notes.")
  }

  try {
    // Try to extract JSON from the response
    let jsonText = content.text.trim()

    // If wrapped in code blocks, extract the JSON
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim()
    }

    const cards = JSON.parse(jsonText)

    if (!Array.isArray(cards)) {
      throw new Error("Response is not an array")
    }

    return cards as ParsedCard[]
  } catch {
    console.error("Failed to parse AI response:", content.text)
    throw new Error("Failed to parse AI response into cards")
  }
}

export async function generateExampleSentence(
  grammarPoint: string,
  context?: string
): Promise<ExampleSentence> {
  const prompt = GENERATE_SENTENCE_PROMPT
    .replace("{grammarPoint}", grammarPoint)
    .replace("{context}", context || "No additional context")

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
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

  try {
    let jsonText = content.text.trim()

    // If wrapped in code blocks, extract the JSON
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim()
    }

    return JSON.parse(jsonText) as ExampleSentence
  } catch {
    console.error("Failed to parse AI response:", content.text)
    throw new Error("Failed to generate example sentence")
  }
}

export async function generateTestQuestion(
  params: GenerateTestQuestionParams
): Promise<TestQuestionResponse> {
  const { card, direction } = params

  const prompt = buildTestQuestionPrompt(card, direction)

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
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

  try {
    let jsonText = content.text.trim()

    // If wrapped in code blocks, extract the JSON
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim()
    }

    return JSON.parse(jsonText) as TestQuestionResponse
  } catch {
    console.error("Failed to parse AI response:", content.text)
    throw new Error("Failed to parse test question JSON")
  }
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
    `,
    MEANING_TO_HANZI: `
      Show the English meaning.
      Ask the user to provide the Chinese characters (hanzi).
      Question example: "How do you write '${card.english}' in Chinese characters?"
      Correct answer: "${card.hanzi}"
    `,
    PINYIN_TO_HANZI: `
      Show only the pinyin romanization.
      Ask the user to provide the Chinese characters (hanzi).
      Question example: "What are the Chinese characters for '${card.pinyin}'?"
      Correct answer: "${card.hanzi}"
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
