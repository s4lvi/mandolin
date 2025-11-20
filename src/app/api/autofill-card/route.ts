import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

const autofillSchema = z.object({
  field: z.enum(["hanzi", "pinyin", "english", "notes", "type"]),
  context: z.object({
    hanzi: z.string().optional(),
    pinyin: z.string().optional(),
    english: z.string().optional(),
    notes: z.string().optional(),
    type: z.string().optional()
  })
})

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
Return ONLY one of: VOCABULARY, GRAMMAR, PHRASE, or IDIOM
- VOCABULARY: Single words or common 2-character compounds
- GRAMMAR: Grammar patterns or structures
- PHRASE: Common expressions or greetings
- IDIOM: Chinese idioms (成语) or proverbs`
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { field, context } = autofillSchema.parse(body)

    // Build context string
    const contextParts: string[] = []
    if (context.hanzi) contextParts.push(`Hanzi: ${context.hanzi}`)
    if (context.pinyin) contextParts.push(`Pinyin: ${context.pinyin}`)
    if (context.english) contextParts.push(`English: ${context.english}`)
    if (context.notes) contextParts.push(`Notes: ${context.notes}`)
    if (context.type) contextParts.push(`Type: ${context.type}`)

    if (contextParts.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one field as context" },
        { status: 400 }
      )
    }

    const prompt = `${AUTOFILL_PROMPTS[field]}

Context:
${contextParts.join("\n")}

Your response:`

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

    const result = content.text.trim()

    return NextResponse.json({ value: result })
  } catch (error) {
    console.error("Error autofilling card:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(
      { error: "Failed to autofill card" },
      { status: 500 }
    )
  }
}
