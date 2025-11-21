"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Volume2, AlertCircle } from "lucide-react"
import { Card as CardType } from "@/types"
import { speakChinese, preloadVoices } from "@/lib/speech"
import { toast } from "sonner"

interface MultipleChoiceQuestionProps {
  questionText: string
  correctAnswer: string
  distractors: string[]
  onAnswer: (isCorrect: boolean, userAnswer: string) => void
  card: CardType
  questionId: string
}

export function MultipleChoiceQuestion({
  questionText,
  correctAnswer,
  distractors,
  onAnswer,
  card,
  questionId
}: MultipleChoiceQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReporting, setIsReporting] = useState(false)

  // Preload voices on mount (important for iOS)
  useEffect(() => {
    preloadVoices()
  }, [])

  // Shuffle options (correct answer + 3 distractors)
  const options = useMemo(() => {
    const allOptions = [correctAnswer, ...distractors]
    return allOptions.sort(() => Math.random() - 0.5)
  }, [correctAnswer, distractors])

  const playAudio = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPlaying) return

    setIsPlaying(true)
    await speakChinese(
      card.hanzi,
      undefined,
      () => setIsPlaying(false),
      () => setIsPlaying(false)
    )
  }

  const handleSubmit = () => {
    if (!selectedAnswer) return

    const isCorrect = selectedAnswer === correctAnswer
    setShowFeedback(true)

    // After 2 seconds, call onAnswer and move to next card
    setTimeout(() => {
      onAnswer(isCorrect, selectedAnswer)
      // Reset state for next card
      setSelectedAnswer(null)
      setShowFeedback(false)
    }, 2000)
  }

  const handleReportProblem = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isReporting) return

    setIsReporting(true)

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BUG",
          message: `Problem with test question:\nQuestion: ${questionText}\nCorrect Answer: ${correctAnswer}\nCard: ${card.hanzi} (${card.pinyin}) - ${card.english}`,
          testQuestionId: questionId
        })
      })

      if (!response.ok) {
        throw new Error("Failed to submit report")
      }

      toast.success("Problem reported. Thank you!")
    } catch (error) {
      toast.error("Failed to report problem")
    } finally {
      setIsReporting(false)
    }
  }

  // If showing feedback, display result with card info
  if (showFeedback) {
    const isCorrect = selectedAnswer === correctAnswer

    return (
      <Card className={`min-h-[300px] ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}`}>
        <CardContent className="p-8">
          <div className="text-center mb-6">
            {isCorrect ? (
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-green-500 p-3 mb-3">
                  <Check className="h-8 w-8 text-white" />
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">Correct!</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-red-500 p-3 mb-3">
                  <X className="h-8 w-8 text-white" />
                </div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">Incorrect</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You answered: <span className="font-medium">{selectedAnswer}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Correct answer: <span className="font-medium text-green-600 dark:text-green-400">{correctAnswer}</span>
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-3xl font-bold">{card.hanzi}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={playAudio}
                  disabled={isPlaying}
                  title="Play pronunciation"
                >
                  <Volume2 className={`h-4 w-4 ${isPlaying ? 'animate-pulse' : ''}`} />
                </Button>
              </div>
              <p className="text-lg text-muted-foreground">{card.pinyin}</p>
              <p className="text-xl mt-2">{card.english}</p>
            </div>

            {card.notes && (
              <p className="text-sm text-muted-foreground text-center mb-4">
                {card.notes}
              </p>
            )}

            <div className="flex flex-wrap gap-1 justify-center">
              <Badge variant="outline">{card.type.toLowerCase()}</Badge>
              {card.lesson && (
                <Badge variant="secondary">Lesson {card.lesson.number}</Badge>
              )}
            </div>

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReportProblem}
                disabled={isReporting}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                {isReporting ? "Reporting..." : "Report problem"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Question view
  return (
    <Card className="min-h-[300px]">
      <CardContent className="p-8">
        <div className="mb-6">
          <p className="text-xl font-medium text-center mb-6">{questionText}</p>
        </div>

        <div className="space-y-3 mb-6">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => setSelectedAnswer(option)}
              className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                selectedAnswer === option
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
            >
              <span className="font-medium">{option}</span>
            </button>
          ))}
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!selectedAnswer}
        >
          Submit Answer
        </Button>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReportProblem}
            disabled={isReporting}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            {isReporting ? "Reporting..." : "Report problem"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
