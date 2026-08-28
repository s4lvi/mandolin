import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { CLAUDE_MODEL_FAST, DECOMPOSE_SYSTEM } from "@/lib/constants"
import {
  getAnthropic,
  FAST_REQUEST_OPTIONS,
  cachedSystem,
  logUsage,
  anthropicErrorResponse
} from "@/lib/ai"
import { z } from "zod"
import { rateLimited, RATE_LIMITS } from "@/lib/rate-limit"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api/decompose")

const decomposeSchema = z.object({
  hanzi: z.string().min(1).max(50)
})

const decompositionSchema = z.object({
  components: z.string(),
  radicals: z.string(),
  etymology: z.string()
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { hanzi } = decomposeSchema.parse(body)

    // Persistent cache shared across instances (checked before rate limiting — hits are free)
    const cached = await prisma.characterDecomposition.findUnique({ where: { hanzi } })
    if (cached) {
      const parsed = decompositionSchema.safeParse(cached.data)
      if (parsed.success) {
        return NextResponse.json(parsed.data)
      }
      logger.warn("Cached decomposition failed validation; regenerating", { hanzi })
    }

    const limited = rateLimited(`ai:light:${session.user.id}`, RATE_LIMITS.AI_LIGHT)
    if (limited) return limited

    const response = await getAnthropic().messages.parse(
      {
        model: CLAUDE_MODEL_FAST,
        max_tokens: 512,
        system: cachedSystem(DECOMPOSE_SYSTEM),
        messages: [{ role: "user", content: `Character(s): ${hanzi}` }],
        output_config: { format: zodOutputFormat(decompositionSchema) }
      },
      FAST_REQUEST_OPTIONS
    )
    logUsage(logger, "decompose", response.usage)

    const data = response.parsed_output
    if (!data) {
      logger.error("Decomposition failed to parse", { hanzi, stopReason: response.stop_reason })
      return NextResponse.json({ error: "AI returned an unexpected response" }, { status: 502 })
    }

    await prisma.characterDecomposition.upsert({
      where: { hanzi },
      create: { hanzi, data },
      update: { data }
    })

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    const aiError = anthropicErrorResponse(error)
    if (aiError) return aiError
    logger.error("Error decomposing character", { error })
    return NextResponse.json(
      { error: "Failed to decompose character" },
      { status: 500 }
    )
  }
}
