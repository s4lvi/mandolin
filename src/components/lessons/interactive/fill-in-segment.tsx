"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react"

interface FillInSegmentProps {
  sentence: string
  correctAnswer: string
  pinyin: string
  translation: string
  hint?: string
  onAnswer: (isCorrect: boolean, userAnswer: string) => void
}

export function FillInSegment({
  sentence,
  correctAnswer,
  pinyin,
  translation,
  hint,
  onAnswer
}: FillInSegmentProps) {
  const [userAnswer, setUserAnswer] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showHint, setShowHint] = useState(false)

  const handleSubmit = () => {
    if (!userAnswer.trim()) return

    const isCorrect =
      userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
    setIsSubmitted(true)
    onAnswer(isCorrect, userAnswer)
  }

  const isCorrect =
    userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Fill in the blank:</h3>
          <div className="text-2xl font-medium">
            {sentence.replace("___", "__________")}
          </div>
          <div className="text-sm italic text-muted-foreground">&quot;{translation}&quot;</div>
        </div>

        {hint && !isSubmitted && (
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
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={isSubmitted}
            placeholder="Type your answer..."
            className="text-lg"
          />

          {!isSubmitted ? (
            <Button
              onClick={handleSubmit}
              disabled={!userAnswer.trim()}
              className="w-full"
            >
              Submit Answer
            </Button>
          ) : (
            <div
              className={`p-4 rounded ${
                isCorrect
                  ? "bg-green-50 dark:bg-green-950 border border-green-500"
                  : "bg-red-50 dark:bg-red-950 border border-red-500"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-semibold">
                  {isCorrect ? "Correct!" : "Not quite"}
                </span>
              </div>
              {!isCorrect && (
                <p className="text-sm mb-1">
                  The correct answer is: <span className="font-bold">{correctAnswer}</span>
                </p>
              )}
              {pinyin && (
                <p className="text-sm text-muted-foreground">
                  {pinyin}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
