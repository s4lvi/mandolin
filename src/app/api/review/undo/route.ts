import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { Quality, calculateLevel, parseSRSSnapshot } from "@/lib/srs"

const undoSchema = z.object({
  historyId: z.string().min(1)
})

// Streak-related UserStats fields captured alongside the SRS snapshot (newer
// history rows only; older rows fall back to a plain decrement)
interface StatsSnapshot {
  currentStreak: number
  longestStreak: number
  lastReviewDate: string | null
  dailyProgress: number
}

function parseStatsSnapshot(value: unknown): StatsSnapshot | null {
  if (!value || typeof value !== "object") return null
  const v = (value as { stats?: unknown }).stats
  if (!v || typeof v !== "object") return null
  const s = v as Record<string, unknown>
  if (
    typeof s.currentStreak !== "number" ||
    typeof s.longestStreak !== "number" ||
    typeof s.dailyProgress !== "number" ||
    (s.lastReviewDate !== null && typeof s.lastReviewDate !== "string")
  ) {
    return null
  }
  return {
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    lastReviewDate: (s.lastReviewDate as string | null) ?? null,
    dailyProgress: s.dailyProgress
  }
}

// POST /api/review/undo - Revert the user's most recent review
//
// Restores the card's SRS fields from the snapshot taken when the review was
// submitted, backs the XP / review counters (and, when snapshotted, the streak
// fields) out of UserStats, revokes any achievements unlocked by the review,
// and deletes the history row. Only the most recent review can be undone so
// that later reviews never sit on top of a reverted snapshot.
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    const body = await req.json()
    const { historyId } = undoSchema.parse(body)

    const [history, recent] = await Promise.all([
      prisma.reviewHistory.findUnique({ where: { id: historyId } }),
      prisma.reviewHistory.findMany({
        where: { userId },
        orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
        take: 2,
        select: { id: true }
      })
    ])

    if (!history || history.userId !== userId) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // Two ratings submitted back-to-back can commit with inverted reviewedAt
    // timestamps, so accept either of the last two rows as long as nothing
    // newer has been recorded for the same card.
    const isRecent = recent.some((r) => r.id === history.id)
    const laterForCard = isRecent
      ? await prisma.reviewHistory.findFirst({
          where: {
            userId,
            cardId: history.cardId,
            id: { not: history.id },
            reviewedAt: { gte: history.reviewedAt }
          },
          select: { id: true }
        })
      : null

    if (!isRecent || laterForCard) {
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
    const statsSnapshot = parseStatsSnapshot(history.previousCard)

    const wasCorrect = history.quality >= Quality.GOOD

    const { card, stats, xpReverted } = await prisma.$transaction(async (tx) => {
      const userStats = await tx.userStats.findUnique({ where: { userId } })

      // Revoke achievements unlocked by this review and claw back their XP
      const revoked = await tx.userAchievement.findMany({
        where: { userId, unlockedAt: { gte: history.reviewedAt } },
        include: { achievement: { select: { xpReward: true } } }
      })
      const achievementXp = revoked.reduce((sum, ua) => sum + ua.achievement.xpReward, 0)
      if (revoked.length > 0) {
        await tx.userAchievement.deleteMany({
          where: { id: { in: revoked.map((ua) => ua.id) } }
        })
      }

      const xpReverted = history.xpEarned + achievementXp
      const totalXp = Math.max(0, (userStats?.totalXp ?? 0) - xpReverted)
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
              ...(statsSnapshot
                ? {
                    currentStreak: statsSnapshot.currentStreak,
                    longestStreak: statsSnapshot.longestStreak,
                    lastReviewDate: statsSnapshot.lastReviewDate
                      ? new Date(statsSnapshot.lastReviewDate)
                      : null,
                    dailyProgress: statsSnapshot.dailyProgress
                  }
                : { dailyProgress: Math.max(0, userStats.dailyProgress - 1) })
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

      return { card, stats, xpReverted }
    })

    return NextResponse.json({ card, stats, xpReverted })
  } catch (error) {
    console.error("Error undoing review:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to undo review" }, { status: 500 })
  }
}
