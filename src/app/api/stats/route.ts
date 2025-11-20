import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { xpProgressInLevel } from "@/lib/srs"

// GET /api/stats - Get user stats and achievements
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get or create user stats
    let userStats = await prisma.userStats.findUnique({
      where: { userId: session.user.id }
    })

    if (!userStats) {
      userStats = await prisma.userStats.create({
        data: { userId: session.user.id }
      })
    }

    // Get user achievements
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: session.user.id },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" }
    })

    // Get all achievements for progress tracking
    const allAchievements = await prisma.achievement.findMany({
      orderBy: { requirement: "asc" }
    })

    // Get user's deck
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    // Card state counts
    let cardStats = {
      total: 0,
      new: 0,
      learning: 0,
      review: 0,
      learned: 0,
      dueToday: 0
    }

    if (deck) {
      const now = new Date()

      // Use groupBy to get all state counts in a single query
      const [stateCounts, dueToday] = await Promise.all([
        prisma.card.groupBy({
          by: ["state"],
          where: { deckId: deck.id },
          _count: true
        }),
        prisma.card.count({
          where: {
            deckId: deck.id,
            OR: [
              { nextReview: null },
              { nextReview: { lte: now } },
              { state: "NEW" }
            ]
          }
        })
      ])

      // Extract counts by state (defaults to 0 if state doesn't exist)
      const total = stateCounts.reduce((sum, s) => sum + s._count, 0)
      const newCards = stateCounts.find((s) => s.state === "NEW")?._count || 0
      const learning = stateCounts.find((s) => s.state === "LEARNING")?._count || 0
      const review = stateCounts.find((s) => s.state === "REVIEW")?._count || 0
      const learned = stateCounts.find((s) => s.state === "LEARNED")?._count || 0

      cardStats = { total, new: newCards, learning, review, learned, dueToday }
    }

    // Get review history for the last 30 days (for heatmap)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const reviewHistory = await prisma.reviewHistory.groupBy({
      by: ["reviewedAt"],
      where: {
        userId: session.user.id,
        reviewedAt: { gte: thirtyDaysAgo }
      },
      _count: true
    })

    // Transform to daily counts
    const dailyReviews: Record<string, number> = {}
    reviewHistory.forEach((entry) => {
      const date = new Date(entry.reviewedAt).toISOString().split("T")[0]
      dailyReviews[date] = (dailyReviews[date] || 0) + entry._count
    })

    // Get recent review history with quality breakdown
    const recentReviews = await prisma.reviewHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { reviewedAt: "desc" },
      take: 100,
      select: {
        quality: true,
        xpEarned: true,
        reviewedAt: true
      }
    })

    // Calculate accuracy over time
    const qualityCounts = { again: 0, hard: 0, good: 0, easy: 0 }
    recentReviews.forEach((review) => {
      switch (review.quality) {
        case 0:
          qualityCounts.again++
          break
        case 1:
          qualityCounts.hard++
          break
        case 2:
          qualityCounts.good++
          break
        case 3:
          qualityCounts.easy++
          break
      }
    })

    // Calculate XP progress in current level
    const xpProgress = xpProgressInLevel(userStats.totalXp)

    return NextResponse.json({
      stats: {
        ...userStats,
        xpProgress
      },
      achievements: achievements.map((ua) => ({
        ...ua.achievement,
        unlockedAt: ua.unlockedAt
      })),
      allAchievements,
      cardStats,
      dailyReviews,
      qualityCounts,
      accuracy:
        recentReviews.length > 0
          ? Math.round(
              ((qualityCounts.good + qualityCounts.easy) / recentReviews.length) * 100
            )
          : 0
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
