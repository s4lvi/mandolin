import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"
import { TRANSLATION_EVAL_PROMPT } from "@/lib/constants"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

interface EvaluateRequest {
  segmentId: string
  segmentType: string
  userAnswer: string
  sourceText?: string
  acceptableTranslations?: string[]
  correctAnswer?: string
}

interface EvaluationResult {
  isCorrect: boolean
  explanation: string
  correctAnswer: string
  encouragement: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as EvaluateRequest

    const { segmentType, userAnswer, sourceText, acceptableTranslations, correctAnswer } = body

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
        model: "claude-sonnet-4-20250514",
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

      // Strip markdown code blocks if present
      let jsonText = content.text.trim()
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7)
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3)
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3)
      }
      jsonText = jsonText.trim()

      const evaluation = JSON.parse(jsonText) as EvaluationResult

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
