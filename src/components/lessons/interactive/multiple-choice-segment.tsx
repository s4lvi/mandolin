"use client"

import { useId, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle } from "lucide-react"

export interface SavedSegmentResponse {
  correct: boolean
  userAnswer: string
}

interface MultipleChoiceSegmentProps {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  /** Saved answer from a previous visit — renders as already answered, no re-submission */
  initialResponse?: SavedSegmentResponse | null
  /** `userAnswer` is the chosen option index as a string (persisted for restore) */
  onAnswer: (isCorrect: boolean, userAnswer: string) => void
}

function restoreIndex(response: SavedSegmentResponse | null | undefined, correctIndex: number): number | null {
  if (!response) return null
  const parsed = parseInt(response.userAnswer, 10)
  if (!Number.isNaN(parsed)) return parsed
  // Older saves didn't record the choice — show the correct one if they got it right
  return response.correct ? correctIndex : null
}

export function MultipleChoiceSegment({
  question,
  options,
  correctIndex,
  explanation,
  initialResponse,
  onAnswer
}: MultipleChoiceSegmentProps) {
  const id = useId()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(() =>
    restoreIndex(initialResponse, correctIndex)
  )
  const [isSubmitted, setIsSubmitted] = useState(!!initialResponse)

  const handleSubmit = () => {
    if (selectedIndex === null || isSubmitted) return

    const isCorrect = initialResponse ? initialResponse.correct : selectedIndex === correctIndex
    setIsSubmitted(true)
    onAnswer(isCorrect, String(selectedIndex))
  }

  const isCorrect = selectedIndex === correctIndex

  return (
    <Card className="border-l-4 border-l-yellow-500">
      <CardContent className="pt-6 space-y-4">
        <h3 className="font-semibold text-lg">{question}</h3>

        <RadioGroup
          value={selectedIndex?.toString()}
          onValueChange={(value) => setSelectedIndex(parseInt(value))}
          disabled={isSubmitted}
          name={`${id}-choice`}
        >
          <div className="space-y-3">
            {options.map((option, index) => {
              const isSelected = index === selectedIndex
              const showCorrect = isSubmitted && index === correctIndex
              const showIncorrect = isSubmitted && isSelected && !isCorrect

              return (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-3 rounded border transition-colors ${
                    showCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : showIncorrect
                      ? "border-red-500 bg-red-50 dark:bg-red-950"
                      : isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value={index.toString()} id={`${id}-option-${index}`} />
                  <Label
                    htmlFor={`${id}-option-${index}`}
                    className="flex-1 cursor-pointer"
                  >
                    {option}
                  </Label>
                  {showCorrect && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  {showIncorrect && <XCircle className="h-5 w-5 text-red-600" />}
                </div>
              )
            })}
          </div>
        </RadioGroup>

        {!isSubmitted ? (
          <Button
            onClick={handleSubmit}
            disabled={selectedIndex === null}
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
            <p className="text-sm text-muted-foreground">{explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
