"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Lightbulb, Languages } from "lucide-react"

interface TranslationSegmentProps {
  type: "TRANSLATION_EN_ZH" | "TRANSLATION_ZH_EN"
  sourceText: string
  acceptableTranslations: string[]
  hint?: string
  onAnswer: (userAnswer: string) => Promise<{ correct: boolean; feedback?: any }>
}

export function TranslationSegment({
  type,
  sourceText,
  acceptableTranslations,
  hint,
  onAnswer
}: TranslationSegmentProps) {
  const [userAnswer, setUserAnswer] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ correct: boolean; feedback?: any } | null>(null)
  const [showHint, setShowHint] = useState(false)

  const direction = type === "TRANSLATION_EN_ZH" ? "Chinese" : "English"

  const handleSubmit = async () => {
    if (!userAnswer.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const evalResult = await onAnswer(userAnswer)
      setResult(evalResult)
    } catch (error) {
      console.error("Error evaluating translation:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-l-4 border-l-indigo-500">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Languages className="h-4 w-4" />
          <span className="text-sm">Translate to {direction}</span>
        </div>

        <div className="p-4 bg-muted rounded text-lg font-medium">
          {sourceText}
        </div>

        {hint && !result && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHint(!showHint)}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              {showHint ? "Hide" : "Show"} Hint
            </Button>
            {showHint && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-500 rounded text-sm">
                {hint}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Input
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isSubmitting && handleSubmit()}
            disabled={!!result || isSubmitting}
            placeholder={`Type your ${direction} translation...`}
            className="text-lg"
          />

          {!result ? (
            <Button
              onClick={handleSubmit}
              disabled={!userAnswer.trim() || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Evaluating...
                </>
              ) : (
                "Submit Translation"
              )}
            </Button>
          ) : (
            <div
              className={`p-4 rounded ${
                result.correct
                  ? "bg-green-50 dark:bg-green-950 border border-green-500"
                  : "bg-red-50 dark:bg-red-950 border border-red-500"
              }`}
            >
              <div className="space-y-3">
                <div className="font-semibold">
                  {result.correct ? "Excellent!" : "Not quite"}
                </div>

                {result.feedback?.content?.explanation && (
                  <p className="text-sm">{result.feedback.content.explanation}</p>
                )}

                {result.feedback?.content?.correctAnswer && (
                  <div className="text-sm">
                    <span className="font-medium">Suggested translation: </span>
                    <span className="font-bold">{result.feedback.content.correctAnswer}</span>
                  </div>
                )}

                {result.feedback?.content?.encouragement && (
                  <p className="text-sm italic text-muted-foreground">
                    {result.feedback.content.encouragement}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {result?.feedback && (
          <div className="text-xs text-muted-foreground">
            <details>
              <summary className="cursor-pointer hover:text-foreground">
                Show acceptable translations
              </summary>
              <ul className="mt-2 space-y-1 pl-4">
                {acceptableTranslations.map((translation, index) => (
                  <li key={index}>• {translation}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
