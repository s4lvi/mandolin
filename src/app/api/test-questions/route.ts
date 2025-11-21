import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { generateTestQuestion } from "@/lib/ai"
import { z } from "zod"

const generateQuestionSchema = z.object({
  cardId: z.string(),
  direction: z.enum(["HANZI_TO_MEANING", "MEANING_TO_HANZI", "PINYIN_TO_HANZI"])
})

// POST /api/test-questions - Get or generate test question
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { cardId, direction } = generateQuestionSchema.parse(body)

    // Verify card belongs to user
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        deck: { select: { userId: true } },
        testQuestions: {
          where: { direction }
        }
      }
    })

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    if (card.deck.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if question already cached
    let testQuestion = card.testQuestions[0]

    if (testQuestion) {
      // Update usage count
      await prisma.testQuestion.update({
        where: { id: testQuestion.id },
        data: { timesUsed: { increment: 1 } }
      })

      return NextResponse.json({
        cached: true,
        question: testQuestion
      })
    }

    // Generate new question via AI
    const generated = await generateTestQuestion({
      card: {
        hanzi: card.hanzi,
        pinyin: card.pinyin,
        english: card.english,
        type: card.type,
        notes: card.notes || undefined
      },
      direction
    })

    // Cache in database
    testQuestion = await prisma.testQuestion.create({
      data: {
        cardId,
        direction,
        questionText: generated.questionText,
        correctAnswer: generated.correctAnswer,
        acceptableAnswers: generated.acceptableAnswers,
        distractors: generated.distractors,
        timesUsed: 1
      }
    })

    return NextResponse.json({
      cached: false,
      question: testQuestion
    })

  } catch (error) {
    console.error("Error generating test question:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to generate question" },
      { status: 500 }
    )
  }
}
