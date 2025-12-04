import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/auth-options"
import { prisma } from "@/lib/prisma"

interface SaveProgressRequest {
  lessonId: string
  currentPage: number
  totalPages: number
  responses: Array<{
    segmentId: string
    correct: boolean
    userAnswer: string
  }>
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const lessonId = searchParams.get("lessonId")

    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId is required" },
        { status: 400 }
      )
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify user has access to this lesson
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deck: { userId: user.id }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Fetch progress
    const progress = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId
        }
      }
    })

    if (!progress) {
      // No progress yet, return initial state
      return NextResponse.json({
        currentPage: 1,
        totalPages: 0,
        responses: [],
        completedAt: null
      })
    }

    return NextResponse.json({
      currentPage: progress.currentPage,
      totalPages: progress.totalPages,
      responses: progress.responses,
      completedAt: progress.completedAt
    })
  } catch (error) {
    console.error("Error fetching lesson progress:", error)
    return NextResponse.json(
      { error: "Failed to fetch lesson progress" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as SaveProgressRequest
    const { lessonId, currentPage, totalPages, responses } = body

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify user has access to this lesson
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deck: { userId: user.id }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Check if lesson is complete
    const isComplete = currentPage > totalPages

    // Upsert progress
    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId
        }
      },
      create: {
        userId: user.id,
        lessonId,
        currentPage: isComplete ? totalPages : currentPage,
        totalPages,
        responses,
        completedAt: isComplete ? new Date() : null
      },
      update: {
        currentPage: isComplete ? totalPages : currentPage,
        totalPages,
        responses,
        completedAt: isComplete ? new Date() : undefined
      }
    })

    return NextResponse.json({
      success: true,
      progress: {
        currentPage: progress.currentPage,
        totalPages: progress.totalPages,
        completedAt: progress.completedAt
      }
    })
  } catch (error) {
    console.error("Error saving lesson progress:", error)
    return NextResponse.json(
      { error: "Failed to save lesson progress" },
      { status: 500 }
    )
  }
}
