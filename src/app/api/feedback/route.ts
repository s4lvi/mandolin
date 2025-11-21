import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"

const feedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE", "GENERAL"]),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  email: z.string().email().or(z.literal("")).optional(),
  testQuestionId: z.string().optional() // Optional: for reporting test question issues
})

// POST /api/feedback - Submit feedback
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = feedbackSchema.parse(body)

    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        type: data.type,
        message: data.message,
        email: data.email && data.email !== "" ? data.email : null,
        testQuestionId: data.testQuestionId || null
      }
    })

    return NextResponse.json({ feedback }, { status: 201 })
  } catch (error) {
    console.error("Error submitting feedback:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    )
  }
}

// GET /api/feedback - Get all feedback (admin only for now)
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // For now, users can only see their own feedback
    const feedback = await prisma.feedback.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { email: true, name: true }
        }
      }
    })

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("Error fetching feedback:", error)
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    )
  }
}
