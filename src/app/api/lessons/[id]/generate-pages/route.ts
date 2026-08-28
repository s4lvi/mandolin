import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { LESSON_TOTAL_PAGES } from "@/lib/constants"
import { rateLimited, RATE_LIMITS } from "@/lib/rate-limit"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"
import {
  generateLessonPages,
  generateRemainingPagesInBackground
} from "@/lib/page-generation"

const logger = createLogger("api/generate-pages")

/**
 * POST /api/lessons/[id]/generate-pages[?regenerate=true]
 *
 * Returns the lesson's pages. When none exist (or `regenerate` is set) page 1
 * is generated synchronously and the remaining pages are produced in the
 * background; `generating: true` tells the client to poll
 * `/api/lessons/[id]/pages/status` for the rest.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const { id: lessonId } = await params
    const { searchParams } = new URL(req.url)
    const regenerate = searchParams.get("regenerate") === "true"

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deckId: deck.id },
      select: {
        id: true,
        pagesStale: true,
        pagesGenerating: true,
        _count: { select: { cards: true } }
      }
    })
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }
    if (lesson._count.cards === 0) {
      return NextResponse.json({ error: "Lesson has no cards" }, { status: 400 })
    }

    const existingPages = await prisma.lessonPage.findMany({
      where: { lessonId },
      include: { segments: { orderBy: { orderIndex: "asc" } } },
      orderBy: { pageNumber: "asc" }
    })

    // Pages exist (complete or partial): return them unless regenerate was
    // requested. Partial sets are kept so progress isn't invalidated; if the
    // background run died before finishing, top the set up in the background.
    if (!regenerate && existingPages.length > 0) {
      let generating = lesson.pagesGenerating
      if (!generating && existingPages.length < LESSON_TOTAL_PAGES) {
        generating = true
        generateRemainingPagesInBackground(lessonId, deck.id)
      }
      return NextResponse.json({
        lessonId,
        totalPages: existingPages.length,
        stale: lesson.pagesStale,
        generating,
        pages: existingPages.map((page) => ({
          pageNumber: page.pageNumber,
          segmentCount: page.segments.length,
          types: page.segments.map((s) => s.type)
        }))
      })
    }

    // A regenerate while the background run is still writing would race it
    if (regenerate && lesson.pagesGenerating) {
      return NextResponse.json(
        { error: "This lesson is still being generated. Try again in a moment." },
        { status: 409 }
      )
    }

    const limited = rateLimited(`ai:heavy:${deck.userId}`, RATE_LIMITS.AI_HEAVY)
    if (limited) return limited

    // Page 1 now (swapped in atomically with the delete on regenerate), the rest later
    const { firstPage } = await generateLessonPages(lessonId, deck.id, {
      firstPageOnly: true,
      regenerate
    })
    generateRemainingPagesInBackground(lessonId, deck.id)

    logger.info("First page generated", { lessonId, regenerate })

    return NextResponse.json({
      lessonId,
      totalPages: 1,
      stale: false,
      generating: true,
      pages: [
        {
          pageNumber: firstPage.pageNumber,
          segmentCount: firstPage.segments.length,
          types: firstPage.segments.map((s) => s.type)
        }
      ]
    })
  } catch (error) {
    logger.error("Error generating lesson pages", { error })
    return handleRouteError(error)
  }
}
