import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { CLAUDE_MODEL } from "@/lib/constants"
import { stripMarkdownCodeBlock } from "@/lib/api-helpers"
import { rateLimited, RATE_LIMITS } from "@/lib/rate-limit"
import { createLogger } from "@/lib/logger"
import { z } from "zod"

const logger = createLogger("api/stories/generate")
const anthropic = new Anthropic({ timeout: 60_000, maxRetries: 2 })

// Shape consumed by src/app/(dashboard)/stories/page.tsx (StorySentence / Story)
const storySchema = z.object({
  title: z.string().min(1),
  titlePinyin: z.string(),
  titleEnglish: z.string(),
  sentences: z.array(
    z.object({
      hanzi: z.string().min(1),
      pinyin: z.string(),
      english: z.string(),
      newWords: z.array(z.string()).optional()
    })
  ).min(1)
})

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const limited = rateLimited(`ai:heavy:${session.user.id}`, RATE_LIMITS.AI_HEAVY)
    if (limited) return limited

    // Get user's deck and cards
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ error: "No deck found" }, { status: 404 })
    }

    // Get cards the user has reviewed (not brand new) for more relevant stories
    const cards = await prisma.card.findMany({
      where: {
        deckId: deck.id,
        state: { not: "NEW" }
      },
      select: {
        hanzi: true,
        pinyin: true,
        english: true
      },
      orderBy: { lastReviewed: "desc" },
      take: 25 // Use most recently reviewed cards (trimmed for speed)
    })

    // Fallback to all cards if no reviewed cards yet
    const storyCards = cards.length > 0 ? cards : await prisma.card.findMany({
      where: { deckId: deck.id },
      select: { hanzi: true, pinyin: true, english: true },
      take: 20
    })

    if (storyCards.length < 3) {
      return NextResponse.json(
        { error: "You need at least 3 cards to generate a story" },
        { status: 400 }
      )
    }

    const vocabList = storyCards
      .map(c => `${c.hanzi} (${c.pinyin}): ${c.english}`)
      .join("\n")

    const storyPrompt = `You are a Chinese language teacher creating a short reading exercise.

**Student's vocabulary:**
${vocabList}

**Task:** Write a short story (3-5 paragraphs, 8-15 sentences total) in Chinese using PRIMARILY the vocabulary above. You may introduce 1-2 simple new words if needed for coherence, but mark them clearly.

**Response format — return ONLY valid JSON:**
{
  "title": "Story title in Chinese",
  "titlePinyin": "pinyin for the title",
  "titleEnglish": "English translation of title",
  "sentences": [
    {
      "hanzi": "Chinese sentence",
      "pinyin": "full pinyin for sentence",
      "english": "English translation",
      "newWords": ["any new word not in student vocab"]
    }
  ]
}

Guidelines:
- Use simple sentence structures appropriate for the vocabulary level
- Create a coherent, interesting narrative (daily life, school, travel, etc.)
- Every sentence should use at least one word from the student's vocabulary
- Include some dialogue for variety

CRITICAL: Return ONLY valid JSON. Do NOT use unescaped double quotes inside string values. Use Chinese quotation marks for dialogue. Ensure all JSON string values are properly escaped.`

    // Stream the response for faster perceived speed
    const encoder = new TextEncoder()
    const userId = session.user.id

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode('{"status":"generating"}\n'))

          const stream = await anthropic.messages.stream({
            model: CLAUDE_MODEL,
            max_tokens: 2048,
            thinking: { type: "disabled" },
            messages: [{ role: "user", content: storyPrompt }]
          })

          let fullText = ""
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              fullText += event.delta.text
              controller.enqueue(encoder.encode('{"status":"streaming"}\n'))
            }
          }

          const jsonText = stripMarkdownCodeBlock(fullText)

          let raw: unknown
          try {
            try {
              raw = JSON.parse(jsonText)
            } catch {
              const firstBrace = jsonText.indexOf("{")
              const lastBrace = jsonText.lastIndexOf("}")
              if (firstBrace === -1 || lastBrace <= firstBrace) throw new Error("no JSON object")
              raw = JSON.parse(jsonText.substring(firstBrace, lastBrace + 1))
            }
          } catch (error) {
            logger.error("Failed to parse story JSON", { error, userId, text: fullText.slice(0, 500) })
            controller.enqueue(encoder.encode(JSON.stringify({ error: "AI returned an unexpected response" }) + '\n'))
            controller.close()
            return
          }

          const validated = storySchema.safeParse(raw)
          if (!validated.success) {
            logger.error("Story failed schema validation", { issues: validated.error.issues, userId, text: fullText.slice(0, 500) })
            controller.enqueue(encoder.encode(JSON.stringify({ error: "AI returned an unexpected response" }) + '\n'))
            controller.close()
            return
          }
          const story = validated.data

          // Save to database
          const saved = await prisma.story.create({
            data: {
              userId,
              title: story.title,
              titlePinyin: story.titlePinyin,
              titleEnglish: story.titleEnglish,
              sentences: story.sentences
            }
          })

          controller.enqueue(encoder.encode(JSON.stringify({ ...story, id: saved.id }) + '\n'))
          controller.close()
        } catch (error) {
          logger.error("Error generating story", { error, userId })
          controller.enqueue(encoder.encode(JSON.stringify({
            error: "Failed to generate story. Please try again."
          }) + '\n'))
          controller.close()
        }
      }
    })

    return new Response(responseStream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked"
      }
    })
  } catch (error) {
    logger.error("Error generating story", { error })
    return NextResponse.json(
      { error: "Failed to generate story" },
      { status: 500 }
    )
  }
}
