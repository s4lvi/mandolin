"use client"

import { Button } from "@/components/ui/button"

export enum Quality {
  AGAIN = 0,
  HARD = 1,
  GOOD = 2,
  EASY = 3
}

interface AnswerButtonsProps {
  onAnswer: (quality: Quality) => void
  disabled?: boolean
  intervalLabels?: {
    again: string
    hard: string
    good: string
    easy: string
  }
}

export function AnswerButtons({ onAnswer, disabled, intervalLabels }: AnswerButtonsProps) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
      <Button
        variant="outline"
        className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm min-h-[48px]"
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); onAnswer(Quality.AGAIN) }}
      >
        <div className="flex flex-col items-center">
          <span>Again</span>
          {intervalLabels && <span className="text-xs opacity-70">{intervalLabels.again}</span>}
        </div>
      </Button>
      {/* Hard button: hidden on mobile (3-button simplification), shown on desktop */}
      <Button
        variant="outline"
        className="hidden md:flex border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-sm min-h-[48px]"
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); onAnswer(Quality.HARD) }}
      >
        <div className="flex flex-col items-center">
          <span>Hard</span>
          {intervalLabels && <span className="text-xs opacity-70">{intervalLabels.hard}</span>}
        </div>
      </Button>
      <Button
        variant="outline"
        className="border-green-500 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 text-sm min-h-[48px]"
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); onAnswer(Quality.GOOD) }}
      >
        <div className="flex flex-col items-center">
          <span>Good</span>
          {intervalLabels && <span className="text-xs opacity-70">{intervalLabels.good}</span>}
        </div>
      </Button>
      <Button
        className="bg-blue-600 hover:bg-blue-700 text-sm min-h-[48px]"
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); onAnswer(Quality.EASY) }}
      >
        <div className="flex flex-col items-center">
          <span>Easy</span>
          {intervalLabels && <span className="text-xs opacity-70">{intervalLabels.easy}</span>}
        </div>
      </Button>
    </div>
  )
}
