import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"
import { CLAUDE_MODEL_FAST } from "@/lib/constants"
import { stripMarkdownCodeBlock } from "@/lib/api-helpers"
import { z } from "zod"
import { rateLimited, RATE_LIMITS } from "@/lib/rate-limit"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api/decompose")
const anthropic = new Anthropic({ timeout: 60_000, maxRetries: 2 })

const decomposeSchema = z.object({
  hanzi: z.string().min(1).max(50)
})

const decompositionSchema = z.object({
  components: z.string(),
  radicals: z.string(),
  etymology: z.string()
})
type Decomposition = z.infer<typeof decompositionSchema>

// Simple bounded in-memory cache (per server instance). Map preserves insertion
// order, so evicting the first key drops the oldest entry.
const CACHE_MAX_ENTRIES = 2000
const cache = new Map<string, Decomposition>()

function cacheSet(key: string, value: Decomposition) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, value)
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { hanzi } = decomposeSchema.parse(body)

    // Check cache (before rate limiting — hits are free)
    const cached = cache.get(hanzi)
    if (cached) {
      return NextResponse.json(cached)
    }

    const limited = rateLimited(`ai:light:${session.user.id}`, RATE_LIMITS.AI_LIGHT)
    if (limited) return limited

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL_FAST,
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

    const jsonText = stripMarkdownCodeBlock(content.text)
    let raw: unknown
    try {
      raw = JSON.parse(jsonText)
    } catch (error) {
      logger.error("Failed to parse decomposition JSON", { error, text: content.text.slice(0, 500) })
      return NextResponse.json({ error: "AI returned an unexpected response" }, { status: 502 })
    }
    const parsed = decompositionSchema.safeParse(raw)
    if (!parsed.success) {
      logger.error("Decomposition failed schema validation", { issues: parsed.error.issues, text: content.text.slice(0, 500) })
      return NextResponse.json({ error: "AI returned an unexpected response" }, { status: 502 })
    }

    // Cache it
    cacheSet(hanzi, parsed.data)

    return NextResponse.json(parsed.data)
  } catch (error) {
    logger.error("Error decomposing character", { error })
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Failed to decompose character" },
      { status: 500 }
    )
  }
}
