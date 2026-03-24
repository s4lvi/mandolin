"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Check, X, Volume2 } from "lucide-react"
import type { Card as CardType, FaceMode } from "@/types"
import { speakChinese, preloadVoices } from "@/lib/speech"

export enum Quality {
  AGAIN = 0,
  HARD = 1,
  GOOD = 2,
  EASY = 3
}

interface RecallCardProps {
  card: CardType
  faceMode: FaceMode
  onAnswer: (quality: Quality) => void
}

export function RecallCard({ card, faceMode, onAnswer }: RecallCardProps) {
  const [userInput, setUserInput] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    preloadVoices()
  }, [])

  // Reset and focus input on new card
  useEffect(() => {
    setUserInput("")
    setSubmitted(false)
    setIsCorrect(false)
    // Auto-play audio for the new card
    setTimeout(() => speakChinese(card.hanzi), 300)
    setTimeout(() => inputRef.current?.focus(), 400)
  }, [card.id])

  // Determine what to prompt and what the expected answer is
  const getPromptAndAnswer = () => {
    switch (faceMode) {
      case "english":
        // Show english, user types hanzi or pinyin
        return {
          prompt: card.english,
          promptLabel: "English",
          answerLabel: "Type the hanzi or pinyin",
          acceptableAnswers: [
            card.hanzi,
            card.pinyin,
            card.pinyin.toLowerCase().replace(/[\s\u0300-\u036f]/g, ""), // stripped tones
          ]
        }
      case "pinyin":
        // Show pinyin, user types english
        return {
          prompt: card.pinyin,
          promptLabel: "Pinyin",
          answerLabel: "Type the English meaning",
          acceptableAnswers: [card.english.toLowerCase()]
        }
      case "immersion":
      case "hanzi":
      default:
        // Show hanzi (+ auto audio), user types english meaning
        return {
          prompt: card.hanzi,
          promptLabel: "Hanzi",
          answerLabel: "Type the English meaning",
          acceptableAnswers: [card.english.toLowerCase()]
        }
    }
  }

  const { prompt, promptLabel, answerLabel, acceptableAnswers } = getPromptAndAnswer()

  const handleSubmit = () => {
    if (!userInput.trim()) return
    const normalized = userInput.trim().toLowerCase()
    const correct = acceptableAnswers.some(a =>
      normalized === a.toLowerCase() ||
      a.toLowerCase().includes(normalized) ||
      normalized.includes(a.toLowerCase())
    )
    setIsCorrect(correct)
    setSubmitted(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (submitted) {
        // Second enter = self-grade as GOOD if correct, AGAIN if not
        onAnswer(isCorrect ? Quality.GOOD : Quality.AGAIN)
      } else {
        handleSubmit()
      }
    }
  }

  if (submitted) {
    return (
      <Card className={`min-h-[300px] ${isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"}`}>
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
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">Not quite</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You typed: <span className="font-medium">{userInput}</span>
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
                  onClick={() => speakChinese(card.hanzi)}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
              {faceMode !== "immersion" && (
                <p className="text-lg text-muted-foreground">{card.pinyin}</p>
              )}
              <p className="text-xl mt-2">{card.english}</p>
            </div>

            {card.notes && (
              <p className="text-sm text-muted-foreground text-center mb-4">{card.notes}</p>
            )}

            <div className="flex flex-wrap gap-1 justify-center mb-4">
              <Badge variant="outline">{card.type.toLowerCase()}</Badge>
            </div>

            {/* Self-grade buttons */}
            <p className="text-xs text-center text-muted-foreground mb-2">How well did you know this?</p>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-50 text-sm"
                onClick={() => onAnswer(Quality.AGAIN)}
              >
                Again
              </Button>
              <Button
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-50 text-sm"
                onClick={() => onAnswer(Quality.HARD)}
              >
                Hard
              </Button>
              <Button
                variant="outline"
                className="border-green-500 text-green-500 hover:bg-green-50 text-sm"
                onClick={() => onAnswer(Quality.GOOD)}
              >
                Good
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-sm"
                onClick={() => onAnswer(Quality.EASY)}
              >
                Easy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="min-h-[300px]">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <p className="text-xs text-muted-foreground mb-2">{promptLabel}</p>
          <div className="flex items-center justify-center gap-2">
            <p className={`font-bold ${faceMode === "english" || faceMode === "pinyin" ? "text-2xl" : "text-4xl"}`}>
              {prompt}
            </p>
            {faceMode !== "english" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => speakChinese(card.hanzi)}
              >
                <Volume2 className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">{answerLabel}</p>
            <Input
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              autoFocus
            />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!userInput.trim()}>
            Check Answer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
