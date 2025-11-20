import Anthropic from "@anthropic-ai/sdk"
import type { ParsedCard, ExampleSentence } from "@/types"
import { PARSE_NOTES_PROMPT, GENERATE_SENTENCE_PROMPT } from "@/lib/constants"

const anthropic = new Anthropic()

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
