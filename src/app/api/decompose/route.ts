import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"
import { CLAUDE_MODEL } from "@/lib/constants"
import { z } from "zod"

const anthropic = new Anthropic()

const decomposeSchema = z.object({
  hanzi: z.string().min(1)
})

// Simple in-memory cache (per server instance)
const cache = new Map<string, { components: string; radicals: string; etymology: string }>()

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { hanzi } = decomposeSchema.parse(body)

    // Check cache
    if (cache.has(hanzi)) {
      return NextResponse.json(cache.get(hanzi))
    }

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Decompose the Chinese character(s) "${hanzi}" into their components/radicals.

Return ONLY valid JSON:
{
  "components": "breakdown showing components e.g. 语 = 讠(speech) + 五(five) + 口(mouth)",
  "radicals": "main radical with meaning e.g. 讠 (speech radical)",
  "etymology": "one sentence about why these parts form this meaning"
}

Keep each field to ONE short line. Be concise.`
        }
      ]
    })

    const content = response.content[0]
    if (content.type !== "text") {
      throw new Error("Unexpected response type")
    }

    let jsonText = content.text.trim()
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim()
    }

    const result = JSON.parse(jsonText)

    // Cache it
    cache.set(hanzi, result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error decomposing character:", error)
    return NextResponse.json(
      { error: "Failed to decompose character" },
      { status: 500 }
    )
  }
}
