import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"
import { z } from "zod"

const logger = createLogger("api/feedback")

const feedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE", "GENERAL"]),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  email: z.string().email().or(z.literal("")).optional(),
  testQuestionId: z.string().optional() // Optional: for reporting test question issues
})

// POST /api/feedback - Submit feedback
export async function POST(req: Request) {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    const body = await req.json()
    const data = feedbackSchema.parse(body)

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        type: data.type,
        message: data.message,
        email: data.email && data.email !== "" ? data.email : null,
        testQuestionId: data.testQuestionId || null
      }
    })

    logger.info("Feedback submitted", { feedbackId: feedback.id, type: data.type })
    return NextResponse.json({ feedback }, { status: 201 })
  } catch (error) {
    logger.error("Failed to submit feedback", { error })
    return handleRouteError(error)
  }
}

// GET /api/feedback - Get all feedback (admin only for now)
export async function GET() {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    // For now, users can only see their own feedback
    const feedback = await prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { email: true, name: true }
        }
      }
    })

    logger.info("Fetched feedback", { userId, count: feedback.length })
    return NextResponse.json({ feedback })
  } catch (error) {
    logger.error("Failed to fetch feedback", { error })
    return handleRouteError(error)
  }
}
