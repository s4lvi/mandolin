"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Volume2, Eye } from "lucide-react"
import type { Card as CardType } from "@/types"
import { speakChinese, preloadVoices } from "@/lib/speech"
import { AnswerButtons, Quality } from "./answer-buttons"

interface ListeningCardProps {
  card: CardType
  onAnswer: (quality: Quality) => void
}

export function ListeningCard({ card, onAnswer }: ListeningCardProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    preloadVoices()
  }, [])

  const playAudio = async () => {
    if (isPlaying) return
    setIsPlaying(true)
    await speakChinese(
      card.hanzi,
      undefined,
      () => setIsPlaying(false),
      () => setIsPlaying(false)
    )
  }

  // Reset and auto-play on new card
  useEffect(() => {
    setIsRevealed(false)
    const timer = setTimeout(() => {
      playAudio()
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  if (isRevealed) {
    return (
      <Card className="min-h-0">
        <CardContent className="p-4 sm:p-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-4xl font-bold">{card.hanzi}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={playAudio}
                disabled={isPlaying}
              >
                <Volume2 className={`h-5 w-5 ${isPlaying ? "animate-pulse" : ""}`} />
              </Button>
            </div>
            <p className="text-xl mt-3">{card.english}</p>
            {card.notes && (
              <p className="text-sm text-muted-foreground mt-2">{card.notes}</p>
            )}
            <div className="flex flex-wrap gap-1 justify-center mt-3">
              <Badge variant="outline">{card.type.toLowerCase()}</Badge>
              {card.lesson && (
                <Badge variant="secondary">Lesson {card.lesson.number}</Badge>
              )}
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground mb-2">
            Did you recognize the word from audio alone?
          </p>
          <AnswerButtons onAnswer={onAnswer} />
        </CardContent>
      </Card>
    )
  }

  // Audio-only front — no text shown
  return (
    <Card className="min-h-0">
      <CardContent className="flex flex-col items-center justify-center py-8 px-4 sm:px-8">
        <p className="text-sm text-muted-foreground mb-6">Listen and recall</p>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full h-20 w-20 sm:h-24 sm:w-24 mb-4 sm:mb-6"
          onClick={playAudio}
          disabled={isPlaying}
        >
          <Volume2 className={`h-10 w-10 ${isPlaying ? "animate-pulse text-primary" : ""}`} />
        </Button>
        <p className="text-xs text-muted-foreground mb-4">
          Can you recall the character and meaning?
        </p>
        <Button onClick={() => setIsRevealed(true)} className="w-full max-w-xs">
          <Eye className="h-4 w-4 mr-2" />
          Reveal Answer
        </Button>
      </CardContent>
    </Card>
  )
}
