"use client"

import { useState, useEffect } from "react"
import { useTestQuestion } from "@/hooks/use-test-questions"
import { MultipleChoiceQuestion } from "./multiple-choice-question"
import { Card as CardType } from "@/types"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface TestCardProps {
  card: CardType
  mode: "multiple_choice"
  direction: string
  onAnswer: (isCorrect: boolean, userAnswer: string) => void
}

export function TestCard({ card, mode, direction, onAnswer }: TestCardProps) {
  const { data, isLoading, error } = useTestQuestion(card.id, direction)

  const [selectedDistractors, setSelectedDistractors] = useState<string[]>([])

  // Randomly select 3 distractors when question loads
  useEffect(() => {
    if (data?.question.distractors) {
      const shuffled = [...data.question.distractors].sort(() => Math.random() - 0.5)
      setSelectedDistractors(shuffled.slice(0, 3))
    }
  }, [data?.question.distractors])

  if (isLoading) {
    return (
      <Card className="min-h-[300px]">
        <CardContent className="flex flex-col items-center justify-center min-h-[300px] p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Generating question...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="min-h-[300px]">
        <CardContent className="flex flex-col items-center justify-center min-h-[300px] p-8">
          <p className="text-center text-red-500 mb-4">
            Failed to load question. Please try again.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { question } = data

  return (
    <MultipleChoiceQuestion
      questionText={question.questionText}
      correctAnswer={question.correctAnswer}
      distractors={selectedDistractors}
      onAnswer={onAnswer}
      card={card}
      questionId={question.id}
    />
  )
}
