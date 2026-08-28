import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { rateLimited, RATE_LIMITS } from "@/lib/rate-limit"
import { createLogger } from "@/lib/logger"
import {
  generateAndSaveStory,
  claimPrefetchedStory,
  prefetchNextStory,
  StoryError
} from "@/lib/story-prefetch"

const logger = createLogger("api/stories/generate")

// NDJSON status events emitted before the final story payload, in order.
// Consumed by src/hooks/use-stories.ts to drive the progress label.
type StoryGenerateStage = "selecting" | "generating" | "finalizing"

// POST /api/stories/generate - Serve the prefetched story if one is waiting,
// otherwise generate one now. Either way the response is an NDJSON stream of
// `{ status }` events followed by the story object (with `id`).
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    // A prefetched story costs nothing to serve, so it bypasses the AI rate limit
    const prefetched = await claimPrefetchedStory(userId)
    if (!prefetched) {
      const limited = rateLimited(`ai:heavy:${userId}`, RATE_LIMITS.AI_HEAVY)
      if (limited) return limited
    }

    const encoder = new TextEncoder()
    const responseStream = new ReadableStream({
      async start(controller) {
        const emit = (payload: unknown) =>
          controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"))
        const emitStatus = (status: StoryGenerateStage) => emit({ status })

        try {
          if (prefetched) {
            logger.info("Serving prefetched story", { userId, storyId: prefetched.id })
            emitStatus("finalizing")
            emit(prefetched)
          } else {
            const story = await generateAndSaveStory(userId, { onStage: emitStatus })
            emit(story)
          }
        } catch (error) {
          logger.error("Error generating story", { error, userId })
          emit({
            error: error instanceof StoryError ? error.message : "Failed to generate story. Please try again."
          })
        } finally {
          controller.close()
          // Have the next one ready before the user asks for it
          void prefetchNextStory(userId)
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
