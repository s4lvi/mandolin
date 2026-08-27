import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { Quality, calculateLevel, parseSRSSnapshot } from "@/lib/srs"

const undoSchema = z.object({
  historyId: z.string().min(1)
})

// POST /api/review/undo - Revert the user's most recent review
//
// Restores the card's SRS fields from the snapshot taken when the review was
// submitted, backs the XP / review counters out of UserStats (streak is left
// alone), and deletes the history row. Only the most recent review can be
// undone so that later reviews never sit on top of a reverted snapshot.
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json()
    const { historyId } = undoSchema.parse(body)

    const [history, latest] = await Promise.all([
      prisma.reviewHistory.findUnique({ where: { id: historyId } }),
      prisma.reviewHistory.findFirst({
        where: { userId },
        orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
        select: { id: true }
      })
    ])

    if (!history || history.userId !== userId) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    if (!latest || latest.id !== history.id) {
      return NextResponse.json(
        { error: "Only the most recent review can be undone" },
        { status: 409 }
      )
    }

    const snapshot = parseSRSSnapshot(history.previousCard)
    if (!snapshot) {
      return NextResponse.json(
        { error: "This review cannot be undone" },
        { status: 409 }
      )
    }

    const wasCorrect = history.quality >= Quality.GOOD

    const { card, stats } = await prisma.$transaction(async (tx) => {
      const userStats = await tx.userStats.findUnique({ where: { userId } })

      const totalXp = Math.max(0, (userStats?.totalXp ?? 0) - history.xpEarned)
      const statsUpdate = userStats
        ? tx.userStats.update({
            where: { userId },
            data: {
              totalXp,
              level: calculateLevel(totalXp),
              totalReviews: Math.max(0, userStats.totalReviews - 1),
              totalCorrect: wasCorrect
                ? Math.max(0, userStats.totalCorrect - 1)
                : undefined,
              dailyProgress: Math.max(0, userStats.dailyProgress - 1)
            }
          })
        : Promise.resolve(null)

      const [card, stats] = await Promise.all([
        tx.card.update({
          where: { id: history.cardId },
          data: {
            easeFactor: snapshot.easeFactor,
            interval: snapshot.interval,
            repetitions: snapshot.repetitions,
            state: snapshot.state,
            nextReview: snapshot.nextReview ? new Date(snapshot.nextReview) : null,
            lastReviewed: snapshot.lastReviewed ? new Date(snapshot.lastReviewed) : null,
            correctCount: snapshot.correctCount,
            incorrectCount: snapshot.incorrectCount
          },
          include: {
            lessons: { include: { lesson: { select: { number: true, title: true } } } },
            tags: { include: { tag: true } }
          }
        }),
        statsUpdate,
        tx.reviewHistory.delete({ where: { id: history.id } })
      ])

      return { card, stats }
    })

    return NextResponse.json({ card, stats, xpReverted: history.xpEarned })
  } catch (error) {
    console.error("Error undoing review:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to undo review" }, { status: 500 })
  }
}
