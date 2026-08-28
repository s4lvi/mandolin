import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { CardType, CardState } from "@prisma/client"
import {
  calculateSRS,
  calculateXP,
  calculateLevel,
  snapshotCardSRS,
  Quality
} from "@/lib/srs"
import { isSameLocalDay, isConsecutiveLocalDay, isValidTimeZone } from "@/lib/dates"
import { REVIEW_DEFAULTS, REVIEW_SOURCES } from "@/lib/constants/review"
import { prefetchTestQuestions, TEST_DIRECTIONS, type TestDirection } from "@/lib/test-question-prefetch"

const reviewResultSchema = z.object({
  cardId: z.string(),
  quality: z.number().int().min(0).max(3), // 0=AGAIN, 1=HARD, 2=GOOD, 3=EASY
  // IANA zone name used for streak / daily-progress day boundaries
  timezone: z.string().max(64).optional().default("UTC"),
  // Where the rating came from (review session, in-lesson practice, drill)
  source: z.enum(REVIEW_SOURCES).optional().default("REVIEW")
})

// Parse and clamp a ?newLimit= query value (max new cards mixed into a session)
function parseNewLimit(raw: string | null): number {
  const parsed = parseInt(raw ?? "", 10)
  if (Number.isNaN(parsed)) return REVIEW_DEFAULTS.DEFAULT_NEW_CARDS_PER_SESSION
  return Math.min(REVIEW_DEFAULTS.MAX_NEW_CARDS_PER_SESSION, Math.max(0, parsed))
}

// Parse and clamp a ?limit= query value
function parseLimit(raw: string | null): number {
  const parsed = parseInt(raw ?? "", 10)
  if (Number.isNaN(parsed)) return REVIEW_DEFAULTS.DEFAULT_CARD_LIMIT
  return Math.min(
    REVIEW_DEFAULTS.MAX_CARD_LIMIT,
    Math.max(REVIEW_DEFAULTS.MIN_CARD_LIMIT, parsed)
  )
}

// GET /api/review - Get cards for review
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseLimit(searchParams.get("limit"))
    const newLimit = parseNewLimit(searchParams.get("newLimit"))
    const lessonId = searchParams.get("lessonId")
    const types = searchParams.get("types")?.split(",").filter(Boolean) || []
    const allCards = searchParams.get("allCards") === "true"
    const tagIds = searchParams.get("tagIds")?.split(",").filter(Boolean) || []
    // Optional: ?prefetchTest=1&direction=HANZI_TO_MEANING kicks off background
    // test-question generation for the returned cards (test mode session start)
    const prefetchTest = searchParams.get("prefetchTest") === "1"
    const prefetchDirection = searchParams.get("direction")

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
      lessons?: { some: { lessonId: string } }
      type?: CardType | { in: CardType[] }
      tags?: { some: { tagId: { in: string[] } } }
    } = { deckId: deck.id }

    if (lessonId) {
      where.lessons = { some: { lessonId } }
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

    const includeClause = {
      lessons: {
        include: { lesson: { select: { number: true, title: true } } }
      },
      tags: {
        include: {
          tag: true
        }
      }
    }

    let cards: Awaited<ReturnType<typeof prisma.card.findMany>>

    if (allCards) {
      // "All cards" mode: no SRS filtering
      cards = await prisma.card.findMany({
        where,
        include: includeClause,
        orderBy: [
          { lastReviewed: "asc" as const },
          { createdAt: "asc" as const }
        ],
        take: limit
      })
    } else {
      // SRS mode: cap new cards at the user's per-session preference, fill the
      // rest with due review cards
      const maxNewCards = Math.min(newLimit, limit)

      // Fetch new cards and due review cards in parallel
      const [newCards, dueCards] = await Promise.all([
        // New cards (never reviewed)
        prisma.card.findMany({
          where: {
            ...where,
            state: CardState.NEW
          },
          include: includeClause,
          orderBy: [
            { isPriority: "desc" as const },
            { createdAt: "asc" as const }
          ],
          take: maxNewCards
        }),
        // Due review cards (have been reviewed before and are due)
        prisma.card.findMany({
          where: {
            ...where,
            state: { not: CardState.NEW },
            OR: [
              { nextReview: null },
              { nextReview: { lte: now } }
            ]
          },
          include: includeClause,
          orderBy: [
            { isPriority: "desc" as const },
            { nextReview: "asc" as const },
            { easeFactor: "asc" as const }
          ],
          take: limit
        })
      ])

      // Combine: prioritize filling with due review cards, then add new cards
      const reviewSlots = limit - Math.min(newCards.length, maxNewCards)
      const selectedReview = dueCards.slice(0, reviewSlots)
      const remainingSlots = limit - selectedReview.length
      const selectedNew = newCards.slice(0, remainingSlots)

      cards = [...selectedReview, ...selectedNew]
    }

    // Run all supplementary queries in parallel
    const [userStats, dueReviewCount, newCount, totalCards, availableTags] = await Promise.all([
      prisma.userStats.findUnique({
        where: { userId: session.user.id }
      }),
      prisma.card.count({
        where: {
          ...where,
          state: { not: CardState.NEW },
          OR: [
            { nextReview: null },
            { nextReview: { lte: now } }
          ]
        }
      }),
      prisma.card.count({
        where: { ...where, state: CardState.NEW }
      }),
      prisma.card.count({ where }),
      prisma.tag.findMany({
        where: {
          cards: {
            some: {
              card: { deckId: deck.id }
            }
          }
        },
        orderBy: { name: "asc" }
      })
    ])

    if (prefetchTest && TEST_DIRECTIONS.includes(prefetchDirection as TestDirection)) {
      // Fire-and-forget; never rejects
      void prefetchTestQuestions(cards.map((c) => c.id), prefetchDirection as TestDirection, session.user.id)
    }

    return NextResponse.json({
      cards,
      userStats,
      dueCount: dueReviewCount + newCount,
      dueReviewCount,
      newCount,
      totalCards,
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
    const { cardId, quality, timezone, source } = reviewResultSchema.parse(body)
    const tz = isValidTimeZone(timezone) ? timezone : "UTC"
    const userId = session.user.id

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

    if (card.deck.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const isCorrect = quality >= Quality.GOOD

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

    const { updatedCard, updatedStats, xpEarned, historyId } = await prisma.$transaction(async (tx) => {
      // Get or create user stats (fresh row inside the transaction)
      const userStats = await tx.userStats.upsert({
        where: { userId },
        create: { userId },
        update: {}
      })

      // Snapshot the pre-review SRS state and the streak-related stats so this
      // review can be undone exactly
      const previousCard = {
        ...snapshotCardSRS(card),
        stats: {
          currentStreak: userStats.currentStreak,
          longestStreak: userStats.longestStreak,
          lastReviewDate: userStats.lastReviewDate
            ? userStats.lastReviewDate.toISOString()
            : null,
          dailyProgress: userStats.dailyProgress
        }
      }

      // Check streak against the user's local calendar
      let isStreak = false
      let newStreak = userStats.currentStreak
      const sameDay = userStats.lastReviewDate
        ? isSameLocalDay(userStats.lastReviewDate, now, tz)
        : false

      if (userStats.lastReviewDate) {
        if (sameDay) {
          // Same day, keep streak
          isStreak = userStats.currentStreak > 0
        } else if (isConsecutiveLocalDay(userStats.lastReviewDate, now, tz)) {
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

      // Calculate XP earned
      const xpEarned = calculateXP(quality as Quality, isStreak, card.state)
      const newLevel = calculateLevel(userStats.totalXp + xpEarned)

      const [updatedCard, updatedStats, history] = await Promise.all([
        tx.card.update({
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
        }),
        tx.userStats.update({
          where: { userId },
          data: {
            totalXp: { increment: xpEarned },
            level: newLevel,
            currentStreak: newStreak,
            longestStreak: Math.max(userStats.longestStreak, newStreak),
            lastReviewDate: now,
            totalReviews: { increment: 1 },
            totalCorrect: isCorrect ? { increment: 1 } : undefined,
            dailyProgress: sameDay ? { increment: 1 } : 1 // Reset on a new day
          }
        }),
        tx.reviewHistory.create({
          data: {
            userId,
            cardId,
            quality,
            easeFactor: srsResult.easeFactor,
            interval: srsResult.interval,
            xpEarned,
            reviewedAt: now,
            source,
            previousCard
          },
          select: { id: true }
        })
      ])

      return { updatedCard, updatedStats, xpEarned, historyId: history.id }
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
      historyId,
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
