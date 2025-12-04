"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Volume2, ChevronDown, ChevronUp } from "lucide-react"
import { speakChinese } from "@/lib/speech"
import { getRelatedCards, type RelatedCard } from "@/lib/lesson-helpers"
import { Quality } from "./flashcard"
import type { Card as CardType } from "@/types"

interface NarrativeModeProps {
  card: CardType
  lessonNotes?: string | null
  lessonCards: CardType[]
  onAnswer: (quality: Quality) => void
  cardNumber: number
  totalCards: number
}

export function NarrativeMode({
  card,
  lessonNotes,
  lessonCards,
  onAnswer,
  cardNumber,
  totalCards
}: NarrativeModeProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [selectedQuality, setSelectedQuality] = useState<Quality | null>(null)
  const [lessonNotesExpanded, setLessonNotesExpanded] = useState(true)
  const [relatedCards, setRelatedCards] = useState<RelatedCard[]>([])

  // Reset state when card changes
  useEffect(() => {
    setIsFlipped(false)
    setShowFeedback(false)
    setSelectedQuality(null)
    setLessonNotesExpanded(true)
  }, [card.id])

  // Get related cards when showing feedback for incorrect answer
  useEffect(() => {
    if (showFeedback && selectedQuality !== null && selectedQuality < Quality.GOOD) {
      const related = getRelatedCards(card as RelatedCard, lessonCards as RelatedCard[], 5)
      setRelatedCards(related)
    }
  }, [showFeedback, selectedQuality, card, lessonCards])

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

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true)
    }
  }

  const handleQualitySelect = (quality: Quality) => {
    setSelectedQuality(quality)

    // If correct (GOOD or EASY), proceed immediately
    if (quality >= Quality.GOOD) {
      onAnswer(quality)
    } else {
      // If incorrect (AGAIN or HARD), show feedback panel
      setShowFeedback(true)
    }
  }

  const handleContinue = () => {
    if (selectedQuality !== null) {
      onAnswer(selectedQuality)
    }
  }

  return (
    <div className="space-y-4">
      {/* Lesson Notes Panel */}
      {lessonNotes && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <button
              onClick={() => setLessonNotesExpanded(!lessonNotesExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="font-semibold text-sm">Lesson Context</span>
              {lessonNotesExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {lessonNotesExpanded && (
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                {lessonNotes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Flashcard */}
      <Card
        className={`min-h-[300px] cursor-pointer transition-all ${
          isFlipped ? "ring-2 ring-primary" : ""
        }`}
        onClick={handleFlip}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 min-h-[300px]">
          <div className="text-center space-y-4 w-full">
            <div className="flex items-center justify-center gap-3">
              <span className="text-5xl font-bold">{card.hanzi}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  playAudio()
                }}
                disabled={isPlaying}
                className="shrink-0"
              >
                <Volume2 className={`h-5 w-5 ${isPlaying ? "animate-pulse" : ""}`} />
              </Button>
            </div>

            <div className="text-xl text-muted-foreground">{card.pinyin}</div>

            {isFlipped ? (
              <div className="space-y-4 pt-4 border-t">
                <div className="text-2xl font-medium text-primary">{card.english}</div>
                {card.notes && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {card.notes}
                  </div>
                )}
                <div className="flex flex-wrap gap-1 justify-center">
                  <Badge variant="outline">{card.type.toLowerCase()}</Badge>
                  {card.tags.map((tag) => (
                    <Badge key={tag.tagId} variant="secondary">
                      {tag.tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm pt-4">
                Tap to see answer
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Answer Buttons - Show after flip */}
      {isFlipped && !showFeedback && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => handleQualitySelect(Quality.AGAIN)}
            className="h-auto py-4 flex-col gap-1 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
          >
            <span className="font-semibold">Again</span>
            <span className="text-xs text-muted-foreground">Didn't know</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleQualitySelect(Quality.HARD)}
            className="h-auto py-4 flex-col gap-1 border-yellow-200 hover:bg-yellow-50 dark:border-yellow-900 dark:hover:bg-yellow-950"
          >
            <span className="font-semibold">Hard</span>
            <span className="text-xs text-muted-foreground">Difficult</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleQualitySelect(Quality.GOOD)}
            className="h-auto py-4 flex-col gap-1 border-green-200 hover:bg-green-50 dark:border-green-900 dark:hover:bg-green-950"
          >
            <span className="font-semibold">Good</span>
            <span className="text-xs text-muted-foreground">Correct</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleQualitySelect(Quality.EASY)}
            className="h-auto py-4 flex-col gap-1 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950"
          >
            <span className="font-semibold">Easy</span>
            <span className="text-xs text-muted-foreground">Too easy</span>
          </Button>
        </div>
      )}

      {/* Feedback Panel - Show on incorrect answer */}
      {showFeedback && selectedQuality !== null && selectedQuality < Quality.GOOD && (
        <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <span className="text-lg font-semibold">⚠️ Let's review this concept</span>
            </div>

            {/* Lesson Context */}
            {lessonNotes && (
              <div className="space-y-2">
                <div className="font-semibold text-sm">📖 Lesson Context</div>
                <div className="text-sm bg-background/50 p-3 rounded border">
                  {lessonNotes}
                </div>
              </div>
            )}

            {/* Card Explanation */}
            {card.notes && (
              <div className="space-y-2">
                <div className="font-semibold text-sm">💡 About this word</div>
                <div className="text-sm bg-background/50 p-3 rounded border">
                  {card.notes}
                </div>
              </div>
            )}

            {/* Related Cards */}
            {relatedCards.length > 0 && (
              <div className="space-y-2">
                <div className="font-semibold text-sm">🔗 Related Cards</div>
                <div className="grid grid-cols-2 gap-2">
                  {relatedCards.map((relatedCard) => (
                    <div
                      key={relatedCard.id}
                      className="p-3 bg-background/50 rounded border text-center space-y-1"
                    >
                      <div className="font-bold">{relatedCard.hanzi}</div>
                      <div className="text-xs text-muted-foreground">
                        {relatedCard.pinyin}
                      </div>
                      <div className="text-xs">{relatedCard.english}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleContinue} className="w-full" size="lg">
              Continue
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
