"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle } from "lucide-react"

interface MultipleChoiceSegmentProps {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  onAnswer: (isCorrect: boolean) => void
}

export function MultipleChoiceSegment({
  question,
  options,
  correctIndex,
  explanation,
  onAnswer
}: MultipleChoiceSegmentProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = () => {
    if (selectedIndex === null) return

    const isCorrect = selectedIndex === correctIndex
    setIsSubmitted(true)
    onAnswer(isCorrect)
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
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label
                    htmlFor={`option-${index}`}
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
