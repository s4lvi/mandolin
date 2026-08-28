import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { createLogger } from "@/lib/logger"
import { prefetchTestQuestions, MAX_PREFETCH_CARDS } from "@/lib/test-question-prefetch"

const logger = createLogger("api/test-questions/prefetch")

const prefetchSchema = z.object({
  cardIds: z.array(z.string().min(1)).min(1).max(MAX_PREFETCH_CARDS),
  direction: z.enum(["HANZI_TO_MEANING", "MEANING_TO_HANZI", "PINYIN_TO_HANZI"])
})

// POST /api/test-questions/prefetch - Kick off background generation of cached
// test questions for a session's cards. Returns immediately; work continues
// server-side. Cards not in the user's deck are silently ignored.
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { cardIds, direction } = prefetchSchema.parse(await req.json())

    const owned = await prisma.card.findMany({
      where: { id: { in: cardIds }, deck: { userId: session.user.id } },
      select: { id: true }
    })
    const ownedIds = owned.map((c) => c.id)

    if (ownedIds.length > 0) {
      // Fire-and-forget; prefetchTestQuestions never rejects
      void prefetchTestQuestions(ownedIds, direction, session.user.id)
    }

    return NextResponse.json({ queued: ownedIds.length }, { status: 202 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    logger.error("Failed to queue test question prefetch", { error })
    return NextResponse.json({ error: "Failed to queue prefetch" }, { status: 500 })
  }
}
