import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"

/**
 * GET /api/lessons/[id]/pages/status
 * Lightweight poll target while pages are being generated in the background.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const { id: lessonId } = await params

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deckId: deck.id },
      select: {
        pagesStale: true,
        pagesGenerating: true,
        _count: { select: { pages: true } }
      }
    })
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        totalPages: lesson._count.pages,
        generating: lesson.pagesGenerating,
        stale: lesson.pagesStale
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    return handleRouteError(error)
  }
}
