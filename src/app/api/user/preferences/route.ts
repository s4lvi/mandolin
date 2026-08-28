import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { handleRouteError } from "@/lib/error-handler"
import {
  reviewPrefsSchema,
  updatePreferencesSchema,
  type PreferencesResponse
} from "@/lib/validations/preferences"

function parsePrefs(raw: unknown) {
  const result = reviewPrefsSchema.safeParse(raw ?? {})
  return result.success ? result.data : reviewPrefsSchema.parse({})
}

// GET /api/user/preferences
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [user, stats] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { reviewPrefs: true }
      }),
      prisma.userStats.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id },
        update: {},
        select: { dailyGoal: true }
      })
    ])

    const body: PreferencesResponse = {
      reviewPrefs: parsePrefs(user?.reviewPrefs),
      dailyGoal: stats.dailyGoal,
      timezone: null
    }
    return NextResponse.json(body)
  } catch (error) {
    return handleRouteError(error)
  }
}

// PUT /api/user/preferences  { reviewPrefs?: Partial<ReviewPrefs>, dailyGoal?: number }
export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = updatePreferencesSchema.parse(await req.json())
    const userId = session.user.id

    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { reviewPrefs: true }
    })
    const merged = reviewPrefsSchema.parse({
      ...parsePrefs(current?.reviewPrefs),
      ...(data.reviewPrefs ?? {})
    })

    const [, stats] = await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { reviewPrefs: merged } }),
      prisma.userStats.upsert({
        where: { userId },
        create: { userId, dailyGoal: data.dailyGoal ?? 20 },
        update: data.dailyGoal !== undefined ? { dailyGoal: data.dailyGoal } : {},
        select: { dailyGoal: true }
      })
    ])

    const body: PreferencesResponse = {
      reviewPrefs: merged,
      dailyGoal: stats.dailyGoal,
      timezone: null
    }
    return NextResponse.json(body)
  } catch (error) {
    return handleRouteError(error)
  }
}
