import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { getAuthenticatedUserDeck, stripMarkdownCodeBlock } from "@/lib/api-helpers"
import { CLAUDE_MODEL, TRANSLATION_EVAL_PROMPT } from "@/lib/constants"
import {
  evaluateRequestSchema,
  aiEvaluationResponseSchema
} from "@/lib/validations/lesson"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

export async function POST(req: NextRequest) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    // Validate request body
    const body = await req.json()
    const validationResult = evaluateRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const {
      segmentId,
      segmentType,
      userAnswer,
      sourceText,
      acceptableTranslations,
      correctAnswer
    } = validationResult.data

    // Verify the segment exists and user has access to it through their deck
    const segment = await prisma.pageSegment.findUnique({
      where: { id: segmentId },
      include: {
        page: {
          include: {
            lesson: {
              select: { deckId: true }
            }
          }
        }
      }
    })

    if (!segment || segment.page.lesson.deckId !== deck.id) {
      return NextResponse.json(
        { error: "Segment not found or unauthorized" },
        { status: 404 }
      )
    }

    // For MULTIPLE_CHOICE and FILL_IN, do simple string comparison
    if (segmentType === "MULTIPLE_CHOICE" || segmentType === "FILL_IN") {
      const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer?.trim().toLowerCase()

      return NextResponse.json({
        correct: isCorrect,
        feedback: isCorrect
          ? null
          : {
              type: "FEEDBACK",
              content: {
                userAnswer,
                correctAnswer: correctAnswer || "",
                explanation: `The correct answer is "${correctAnswer}". ${
                  segmentType === "FILL_IN"
                    ? "Review the sentence structure and try to understand why this word fits."
                    : "Take another look at the question and the meaning of each option."
                }`,
                encouragement: "Keep practicing! You're making progress."
              }
            }
      })
    }

    // For TRANSLATION types, use AI evaluation
    if (
      segmentType === "TRANSLATION_EN_ZH" ||
      segmentType === "TRANSLATION_ZH_EN"
    ) {
      if (!sourceText || !acceptableTranslations) {
        return NextResponse.json(
          { error: "Missing translation data" },
          { status: 400 }
        )
      }

      const direction =
        segmentType === "TRANSLATION_EN_ZH" ? "Chinese" : "English"

      const prompt = TRANSLATION_EVAL_PROMPT.replace("{DIRECTION}", direction)
        .replace("{SOURCE_TEXT}", sourceText)
        .replace("{USER_ANSWER}", userAnswer)
        .replace(
          "{ACCEPTABLE_ANSWERS}",
          acceptableTranslations.join(", ")
        )

      const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })

      const content = message.content[0]
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude")
      }

      // Parse and validate AI response
      const jsonText = stripMarkdownCodeBlock(content.text)
      const rawEvaluation = JSON.parse(jsonText)
      const evaluation = aiEvaluationResponseSchema.parse(rawEvaluation)

      return NextResponse.json({
        correct: evaluation.isCorrect,
        feedback: evaluation.isCorrect
          ? null
          : {
              type: "FEEDBACK",
              content: {
                userAnswer,
                correctAnswer: evaluation.correctAnswer,
                explanation: evaluation.explanation,
                encouragement: evaluation.encouragement
              }
            }
      })
    }

    // For other segment types, no evaluation needed
    return NextResponse.json({
      correct: true,
      feedback: null
    })
  } catch (error) {
    console.error("Error evaluating answer:", error)
    return NextResponse.json(
      { error: "Failed to evaluate answer" },
      { status: 500 }
    )
  }
}
