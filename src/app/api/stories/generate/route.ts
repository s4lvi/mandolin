import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { CLAUDE_MODEL } from "@/lib/constants"
import { stripMarkdownCodeBlock } from "@/lib/api-helpers"

const anthropic = new Anthropic()

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      take: 50 // Use most recently reviewed cards
    })

    // Fallback to all cards if no reviewed cards yet
    const storyCards = cards.length > 0 ? cards : await prisma.card.findMany({
      where: { deckId: deck.id },
      select: { hanzi: true, pinyin: true, english: true },
      take: 30
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

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a Chinese language teacher creating a short reading exercise.

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
- Mark paragraph breaks by leaving the sentences naturally grouped

CRITICAL: Return ONLY valid JSON. Do NOT use unescaped double quotes inside string values. Use Chinese quotation marks (「」or "") for dialogue instead of " quotes. Ensure all JSON string values are properly escaped.`
        }
      ]
    })

    const content = response.content[0]
    if (content.type !== "text") {
      throw new Error("Unexpected response type")
    }

    const jsonText = stripMarkdownCodeBlock(content.text)

    let story
    try {
      story = JSON.parse(jsonText)
    } catch (parseError) {
      console.error("Failed to parse story JSON. Raw text:", content.text.substring(0, 500))
      console.error("Parse error:", parseError)

      // Try to fix common JSON issues: unescaped quotes in Chinese text
      // by finding the JSON object boundaries and re-parsing
      const firstBrace = jsonText.indexOf("{")
      const lastBrace = jsonText.lastIndexOf("}")
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const trimmed = jsonText.substring(firstBrace, lastBrace + 1)
        try {
          story = JSON.parse(trimmed)
        } catch {
          throw new Error("AI returned invalid JSON that could not be repaired")
        }
      } else {
        throw new Error("AI response did not contain valid JSON")
      }
    }

    return NextResponse.json(story)
  } catch (error) {
    console.error("Error generating story:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate story" },
      { status: 500 }
    )
  }
}
