import { NextResponse } from "next/server"
import { generateExampleSentence } from "@/lib/ai"
import { getAuthenticatedUser } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"
import { z } from "zod"
import { rateLimited, RATE_LIMITS } from "@/lib/rate-limit"

const logger = createLogger("api/generate-sentence")

const generateSentenceSchema = z.object({
  grammarPoint: z.string().min(1, "Grammar point is required"),
  context: z.string().optional()
})

export async function POST(req: Request) {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    const limited = rateLimited(`ai:light:${userId}`, RATE_LIMITS.AI_LIGHT)
    if (limited) return limited

    const body = await req.json()
    const data = generateSentenceSchema.parse(body)

    const sentence = await generateExampleSentence(
      data.grammarPoint,
      data.context
    )

    logger.info("Generated example sentence", { grammarPoint: data.grammarPoint })
    return NextResponse.json(sentence)
  } catch (error) {
    logger.error("Failed to generate sentence", { error })
    return handleRouteError(error)
  }
}
