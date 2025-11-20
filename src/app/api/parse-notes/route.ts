import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"
import type { ParsedCard } from "@/types"
import { PREDEFINED_TAGS } from "@/lib/constants"

const anthropic = new Anthropic()

const parseNotesSchema = z.object({
  notes: z.string().min(1, "Notes are required"),
  lessonNumber: z.number().int().positive().optional(),
  lessonTitle: z.string().optional()
})

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

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = parseNotesSchema.parse(body)

    // Get user's deck to check for existing cards
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ error: "No deck found" }, { status: 404 })
    }

    // Get existing cards to mark duplicates
    const existingCards = await prisma.card.findMany({
      where: { deckId: deck.id },
      select: { hanzi: true }
    })
    const existingHanzi = new Set(existingCards.map((c: { hanzi: string }) => c.hanzi))

    // Use streaming to avoid Heroku's 30s timeout
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial heartbeat
          controller.enqueue(encoder.encode('{"status":"processing"}\n'))

          // Stream from Anthropic
          const anthropicStream = await anthropic.messages.stream({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 16384,
            messages: [
              {
                role: "user",
                content: `${PARSE_NOTES_PROMPT}\n\nLesson Notes:\n${data.notes}`
              }
            ]
          })

          let fullText = ""

          // Collect the streamed response
          for await (const event of anthropicStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              fullText += event.delta.text
              // Send heartbeat every so often to keep connection alive
              controller.enqueue(encoder.encode('{"status":"streaming"}\n'))
            }
          }

          const finalMessage = await anthropicStream.finalMessage()

          // Check if response was truncated
          if (finalMessage.stop_reason === "max_tokens") {
            controller.enqueue(encoder.encode(JSON.stringify({
              error: "Response was too long and got truncated. Try with shorter notes."
            }) + '\n'))
            controller.close()
            return
          }

          // Parse the response
          let jsonText = fullText.trim()
          const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
          if (codeBlockMatch) {
            jsonText = codeBlockMatch[1].trim()
          }

          const parsedCards = JSON.parse(jsonText) as ParsedCard[]

          if (!Array.isArray(parsedCards)) {
            throw new Error("Response is not an array")
          }

          // Mark duplicates
          const cardsWithDuplicateInfo = parsedCards.map((card) => ({
            ...card,
            isDuplicate: existingHanzi.has(card.hanzi)
          }))

          // Send final result
          const result = {
            cards: cardsWithDuplicateInfo,
            lessonNumber: data.lessonNumber,
            lessonTitle: data.lessonTitle,
            totalParsed: parsedCards.length,
            duplicatesFound: cardsWithDuplicateInfo.filter((c) => c.isDuplicate).length
          }

          controller.enqueue(encoder.encode(JSON.stringify(result) + '\n'))
          controller.close()
        } catch (error) {
          console.error("Streaming error:", error)
          controller.enqueue(encoder.encode(JSON.stringify({
            error: error instanceof Error ? error.message : "Failed to parse notes"
          }) + '\n'))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked"
      }
    })
  } catch (error) {
    console.error("Error parsing notes:", error)
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
      { error: "Failed to parse notes" },
      { status: 500 }
    )
  }
}
