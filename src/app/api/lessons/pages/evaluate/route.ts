import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { CLAUDE_MODEL_FAST, TRANSLATION_EVAL_SYSTEM, TRANSLATION_EVAL_USER } from "@/lib/constants"
import {
  getAnthropic,
  FAST_REQUEST_OPTIONS,
  cachedSystem,
  logUsage,
  anthropicErrorResponse
} from "@/lib/ai"
import { createLogger } from "@/lib/logger"
import {
  evaluateRequestSchema,
  aiEvaluationResponseSchema,
  multipleChoiceContentSchema,
  fillInContentSchema,
  translationContentSchema
} from "@/lib/validations/lesson"
import { rateLimited, RATE_LIMITS } from "@/lib/rate-limit"

const logger = createLogger("api/lessons/pages/evaluate")

export async function POST(req: NextRequest) {
  try {
    const { error, deck, userId } = await getAuthenticatedUserDeck()
    if (error) return error

    const limited = rateLimited(`ai:light:${userId}`, RATE_LIMITS.AI_LIGHT)
    if (limited) return limited

    // Validate request body
    const body = await req.json()
    const validationResult = evaluateRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { segmentId, segmentType, userAnswer } = validationResult.data

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

    // The expected answer always comes from the stored segment, never the client
    if (segmentType !== segment.type) {
      return NextResponse.json({ error: "Segment type mismatch" }, { status: 400 })
    }

    const normalize = (v: string) => v.trim().toLowerCase()

    if (segmentType === "MULTIPLE_CHOICE" || segmentType === "FILL_IN") {
      let correctAnswer: string
      let isCorrect: boolean

      if (segmentType === "MULTIPLE_CHOICE") {
        const content = multipleChoiceContentSchema.parse(segment.content)
        correctAnswer = content.options[content.correctIndex]
        // Accept either the option text or its index
        isCorrect =
          normalize(userAnswer) === normalize(correctAnswer) ||
          userAnswer.trim() === String(content.correctIndex)
      } else {
        const content = fillInContentSchema.parse(segment.content)
        correctAnswer = content.correctAnswer
        isCorrect = normalize(userAnswer) === normalize(correctAnswer)
      }

      return NextResponse.json({
        correct: isCorrect,
        feedback: isCorrect
          ? null
          : {
              type: "FEEDBACK",
              content: {
                userAnswer,
                correctAnswer,
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
      const { sourceText, acceptableTranslations } = translationContentSchema.parse(
        segment.content
      )

      const direction =
        segmentType === "TRANSLATION_EN_ZH" ? "Chinese" : "English"

      // Function replacers so "$&"-style sequences in values aren't interpreted;
      // the user answer is fenced so the model treats it as data, not instructions
      // (the system prompt tells the model to grade the fenced text strictly as data)
      const fencedAnswer = `<user_answer>\n${userAnswer.replace(/<\/?user_answer>/g, "")}\n</user_answer>`
      const userMessage = TRANSLATION_EVAL_USER.replace("{DIRECTION}", () => direction)
        .replace("{SOURCE_TEXT}", () => sourceText)
        .replace("{USER_ANSWER}", () => fencedAnswer)
        .replace("{ACCEPTABLE_ANSWERS}", () => acceptableTranslations.join(", "))

      const message = await getAnthropic().messages.parse(
        {
          model: CLAUDE_MODEL_FAST,
          max_tokens: 800,
          system: cachedSystem(TRANSLATION_EVAL_SYSTEM),
          messages: [{ role: "user", content: userMessage }],
          output_config: { format: zodOutputFormat(aiEvaluationResponseSchema) }
        },
        FAST_REQUEST_OPTIONS
      )
      logUsage(logger, "translation eval", message.usage)

      const evaluation = message.parsed_output
      if (!evaluation) {
        logger.error("Translation evaluation failed to parse", { stopReason: message.stop_reason })
        return NextResponse.json({ error: "AI returned an unexpected response" }, { status: 502 })
      }

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
    const aiError = anthropicErrorResponse(error)
    if (aiError) return aiError
    logger.error("Error evaluating answer", { error })
    return NextResponse.json(
      { error: "Failed to evaluate answer" },
      { status: 500 }
    )
  }
}
