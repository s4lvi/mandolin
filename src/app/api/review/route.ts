import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { CardType } from "@prisma/client"
import {
  calculateSRS,
  calculateXP,
  calculateLevel,
  Quality,
  isConsecutiveDay,
  isSameDay
} from "@/lib/srs"

const reviewResultSchema = z.object({
  cardId: z.string(),
  quality: z.number().min(0).max(3) // 0=AGAIN, 1=HARD, 2=GOOD, 3=EASY
})

// GET /api/review - Get cards for review
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const lessonId = searchParams.get("lessonId")
    const types = searchParams.get("types")?.split(",").filter(Boolean) || []
    const allCards = searchParams.get("allCards") === "true"
    const tagIds = searchParams.get("tagIds")?.split(",").filter(Boolean) || []

    // Get user's deck
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ cards: [] })
    }

    // Build where clause
    const where: {
      deckId: string
      lessonId?: string
      type?: CardType | { in: CardType[] }
      tags?: { some: { tagId: { in: string[] } } }
    } = { deckId: deck.id }

    if (lessonId) {
      where.lessonId = lessonId
    }

    if (types.length > 0) {
      const validTypes = types.filter((t) => Object.values(CardType).includes(t as CardType)) as CardType[]
      if (validTypes.length === 1) {
        where.type = validTypes[0]
      } else if (validTypes.length > 1) {
        where.type = { in: validTypes }
      }
    }

    if (tagIds.length > 0) {
      where.tags = { some: { tagId: { in: tagIds } } }
    }

    const now = new Date()

    // Get cards - either all cards or just due cards
    const cards = await prisma.card.findMany({
      where: allCards
        ? where
        : {
            ...where,
            OR: [
              { nextReview: null }, // Never reviewed
              { nextReview: { lte: now } }, // Due for review
              { state: "NEW" } // New cards
            ]
          },
      include: {
        lesson: {
          select: { number: true, title: true }
        },
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: allCards
        ? [
            { lastReviewed: "asc" }, // Oldest reviewed first
            { createdAt: "asc" }
          ]
        : [
            { state: "asc" }, // NEW cards first
            { nextReview: "asc" }, // Then by due date (oldest first)
            { easeFactor: "asc" } // Then hardest cards (lowest ease factor)
          ],
      take: limit
    })

    // Get user stats for context
    const userStats = await prisma.userStats.findUnique({
      where: { userId: session.user.id }
    })

    // Get count of total due cards
    const dueCount = await prisma.card.count({
      where: {
        ...where,
        OR: [
          { nextReview: null },
          { nextReview: { lte: now } },
          { state: "NEW" }
        ]
      }
    })

    // Get all tags used by user's cards
    const availableTags = await prisma.tag.findMany({
      where: {
        cards: {
          some: {
            card: {
              deckId: deck.id
            }
          }
        }
      },
      orderBy: { name: "asc" }
    })

    return NextResponse.json({
      cards,
      userStats,
      dueCount,
      totalCards: await prisma.card.count({ where }),
      availableTags
    })
  } catch (error) {
    console.error("Error fetching review cards:", error)
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 }
    )
  }
}

// POST /api/review - Submit review result
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { cardId, quality } = reviewResultSchema.parse(body)

    // Verify card belongs to user
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        deck: {
          select: { userId: true }
        }
      }
    })

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    if (card.deck.userId !== session.user.id) {
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

    const now = new Date()
    const isCorrect = quality >= Quality.GOOD

    // Check streak
    let isStreak = false
    let newStreak = userStats.currentStreak

    if (userStats.lastReviewDate) {
      if (isSameDay(userStats.lastReviewDate, now)) {
        // Same day, keep streak
        isStreak = userStats.currentStreak > 0
      } else if (isConsecutiveDay(userStats.lastReviewDate, now)) {
        // Next day, increment streak
        newStreak += 1
        isStreak = true
      } else {
        // Streak broken
        newStreak = 1
      }
    } else {
      // First review ever
      newStreak = 1
    }

    // Calculate SRS result
    const srsResult = calculateSRS(
      {
        easeFactor: card.easeFactor,
        interval: card.interval,
        repetitions: card.repetitions,
        state: card.state
      },
      quality as Quality
    )

    // Calculate XP earned
    const xpEarned = calculateXP(quality as Quality, isStreak, card.state)
    const newTotalXp = userStats.totalXp + xpEarned
    const newLevel = calculateLevel(newTotalXp)

    // Update card with SRS results
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        correctCount: isCorrect ? { increment: 1 } : undefined,
        incorrectCount: !isCorrect ? { increment: 1 } : undefined,
        lastReviewed: now,
        nextReview: srsResult.nextReview,
        easeFactor: srsResult.easeFactor,
        interval: srsResult.interval,
        repetitions: srsResult.repetitions,
        state: srsResult.state
      }
    })

    // Update user stats
    const updatedStats = await prisma.userStats.update({
      where: { userId: session.user.id },
      data: {
        totalXp: newTotalXp,
        level: newLevel,
        currentStreak: newStreak,
        longestStreak: Math.max(userStats.longestStreak, newStreak),
        lastReviewDate: now,
        totalReviews: { increment: 1 },
        totalCorrect: isCorrect ? { increment: 1 } : undefined,
        dailyProgress: isSameDay(userStats.lastReviewDate || new Date(0), now)
          ? { increment: 1 }
          : 1 // Reset if new day
      }
    })

    // Create review history entry
    await prisma.reviewHistory.create({
      data: {
        userId: session.user.id,
        cardId,
        quality,
        easeFactor: srsResult.easeFactor,
        interval: srsResult.interval,
        xpEarned
      }
    })

    // Check for achievements
    const newAchievements = await checkAndAwardAchievements(
      session.user.id,
      updatedStats
    )

    return NextResponse.json({
      card: updatedCard,
      stats: updatedStats,
      xpEarned,
      newAchievements,
      srsResult: {
        nextReview: srsResult.nextReview,
        interval: srsResult.interval,
        state: srsResult.state
      }
    })
  } catch (error) {
    console.error("Error submitting review:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    )
  }
}

// Helper function to check and award achievements
async function checkAndAwardAchievements(
  userId: string,
  stats: { totalReviews: number; currentStreak: number; totalXp: number; level: number }
) {
  const newAchievements: { name: string; icon: string; xpReward: number }[] = []

  // Fetch all achievements and user's achievements in parallel (2 queries instead of N+1)
  const [achievements, userAchievements] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true }
    })
  ])

  // Create a Set of achievement IDs user already has for O(1) lookup
  const earnedAchievementIds = new Set(
    userAchievements.map(ua => ua.achievementId)
  )

  // Track newly earned achievements to batch create
  const achievementsToCreate: Array<{
    userId: string
    achievementId: string
    progress: number
  }> = []
  let totalXpToAward = 0

  // Check each achievement (in memory, no database queries)
  for (const achievement of achievements) {
    // Skip if user already has this achievement
    if (earnedAchievementIds.has(achievement.id)) continue

    // Check if requirement is met
    let earned = false
    switch (achievement.key) {
      case "first_review":
        earned = stats.totalReviews >= 1
        break
      case "reviews_10":
        earned = stats.totalReviews >= 10
        break
      case "reviews_100":
        earned = stats.totalReviews >= 100
        break
      case "reviews_500":
        earned = stats.totalReviews >= 500
        break
      case "reviews_1000":
        earned = stats.totalReviews >= 1000
        break
      case "streak_3":
        earned = stats.currentStreak >= 3
        break
      case "streak_7":
        earned = stats.currentStreak >= 7
        break
      case "streak_30":
        earned = stats.currentStreak >= 30
        break
      case "level_5":
        earned = stats.level >= 5
        break
      case "level_10":
        earned = stats.level >= 10
        break
      case "xp_1000":
        earned = stats.totalXp >= 1000
        break
      case "xp_10000":
        earned = stats.totalXp >= 10000
        break
    }

    if (earned) {
      achievementsToCreate.push({
        userId,
        achievementId: achievement.id,
        progress: achievement.requirement
      })

      totalXpToAward += achievement.xpReward

      newAchievements.push({
        name: achievement.name,
        icon: achievement.icon,
        xpReward: achievement.xpReward
      })
    }
  }

  // Batch create all newly earned achievements and update XP in a transaction
  if (achievementsToCreate.length > 0) {
    await prisma.$transaction([
      // Create all new achievements at once
      prisma.userAchievement.createMany({
        data: achievementsToCreate
      }),
      // Update total XP once with total from all achievements
      ...(totalXpToAward > 0
        ? [prisma.userStats.update({
            where: { userId },
            data: { totalXp: { increment: totalXpToAward } }
          })]
        : [])
    ])
  }

  return newAchievements
}
