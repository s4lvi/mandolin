import Anthropic from "@anthropic-ai/sdk"
import type { ParsedCard, ExampleSentence } from "@/types"
import { PREDEFINED_TAGS } from "@/lib/constants"

const anthropic = new Anthropic()

const PARSE_NOTES_PROMPT = `You are a Mandarin Chinese language learning assistant.
Parse the following lesson notes into structured flashcard data.

For each vocabulary word, phrase, idiom, or grammar point, extract:
- hanzi: Chinese characters
- pinyin: Romanization with tone marks (e.g., nǐ hǎo, not ni3 hao3)
- english: English translation/meaning
- notes: Any additional context or usage notes from the lesson
- type: One of VOCABULARY, GRAMMAR, PHRASE, or IDIOM
- suggestedTags: 2-4 tags from the allowed list below

ALLOWED TAGS (only use these exact tags):
${PREDEFINED_TAGS.join(", ")}

Rules:
1. ALWAYS use tone marks in pinyin (ā, á, ǎ, à, ē, é, ě, è, ī, í, ǐ, ì, ō, ó, ǒ, ò, ū, ú, ǔ, ù, ǖ, ǘ, ǚ, ǜ), never tone numbers
2. For grammar points, include the pattern/structure in the hanzi field
3. Be thorough - extract ALL vocabulary and grammar points mentioned
4. Provide clear, concise English definitions
5. Add helpful usage notes where relevant
6. For grammar patterns, explain when/how to use them in the notes
7. ONLY use tags from the allowed list above - do not create new tags
8. IMPORTANT: Prefer VOCABULARY over PHRASE. Only use PHRASE for very common fixed expressions (greetings, farewells, idiom-like phrases). Most 2-3 character combinations should be VOCABULARY. If it's primarily teaching a word's meaning, use VOCABULARY even if shown in a short phrase context.

Respond with ONLY a valid JSON array of cards, no other text. Example format:
[
  {
    "hanzi": "你好",
    "pinyin": "nǐ hǎo",
    "english": "hello",
    "notes": "Common greeting",
    "type": "PHRASE",
    "suggestedTags": ["greeting", "daily-life", "HSK-1"]
  }
]`

const GENERATE_SENTENCE_PROMPT = `Generate a simple example sentence demonstrating this Mandarin grammar point or language pattern.

Grammar/Pattern: {grammarPoint}
Additional context: {context}

Requirements:
1. Use basic HSK 1-3 vocabulary where possible
2. Keep the sentence short (5-10 characters ideal, max 15)
3. Clearly demonstrate the grammar pattern
4. Make the context practical and everyday
5. Use tone marks in pinyin (ā, á, ǎ, à, etc.)

Respond with ONLY valid JSON, no other text:
{
  "sentence": "Chinese characters here",
  "pinyin": "pinyin with tone marks",
  "translation": "English translation"
}`

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
