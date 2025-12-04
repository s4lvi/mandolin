import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getAuthenticatedUser } from "@/lib/api-helpers"
import { progressRequestSchema } from "@/lib/validations/lesson"

export async function GET(req: NextRequest) {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    const { searchParams } = new URL(req.url)
    const lessonId = searchParams.get("lessonId")

    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId is required" },
        { status: 400 }
      )
    }

    // Verify user has access to this lesson through their deck
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deck: { userId }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Fetch progress
    const progress = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
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
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    // Validate request body
    const body = await req.json()
    const validationResult = progressRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { lessonId, currentPage, totalPages, responses } = validationResult.data

    // Verify user has access to this lesson through their deck
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        deck: { userId }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Check if lesson is complete (user has moved past the last page)
    const isComplete = currentPage > totalPages

    // Cast responses to Prisma InputJsonValue array
    const responsesJson = (responses || []) as Prisma.InputJsonValue[]

    // Upsert progress
    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      },
      create: {
        userId,
        lessonId,
        currentPage: isComplete ? totalPages : currentPage,
        totalPages,
        responses: responsesJson,
        completedAt: isComplete ? new Date() : null
      },
      update: {
        currentPage: isComplete ? totalPages : currentPage,
        totalPages,
        responses: responsesJson,
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
