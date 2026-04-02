"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Volume2, Puzzle } from "lucide-react"
import { AnswerButtons } from "./answer-buttons"
import type { Card as CardType, FaceMode, ExampleSentence } from "@/types"
import { speakChinese, preloadVoices } from "@/lib/speech"
import { previewInterval, formatInterval, Quality as SRSQuality } from "@/lib/srs"
import { useSwipe } from "@/hooks/use-swipe"
import { isNative } from "@/lib/capacitor"

// Quality ratings for SM-2 algorithm
export enum Quality {
  AGAIN = 0,
  HARD = 1,
  GOOD = 2,
  EASY = 3
}

interface FlashcardProps {
  card: CardType
  faceMode: FaceMode
  onAnswer: (quality: Quality) => void
  onGenerateExample?: () => void
  exampleSentence?: ExampleSentence
  isGenerating?: boolean
  isSubmitting?: boolean
}

export function Flashcard({
  card,
  faceMode,
  onAnswer,
  onGenerateExample,
  exampleSentence,
  isGenerating,
  isSubmitting
}: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPinyin, setShowPinyin] = useState(faceMode !== "immersion")

  // Swipe gestures: left = Again, right = Good (only when flipped)
  const { swipeHandlers, swipeStyle, swipeOverlay } = useSwipe({
    onSwipeLeft: () => {
      if (isFlipped) {
        triggerHaptic()
        onAnswer(Quality.AGAIN)
      }
    },
    onSwipeRight: () => {
      if (isFlipped) {
        triggerHaptic()
        onAnswer(Quality.GOOD)
      }
    },
    enabled: isFlipped
  })

  const triggerHaptic = async () => {
    if (!isNative()) return
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics")
      Haptics.impact({ style: ImpactStyle.Medium })
    } catch {}
  }

  // Preload voices on mount (important for iOS)
  useEffect(() => {
    preloadVoices()
  }, [])

  // Reset flip state and auto-play audio when card changes
  useEffect(() => {
    setIsFlipped(false)
    setShowPinyin(faceMode !== "immersion")
    // Auto-play pronunciation for the new card (slight delay for smooth transition)
    const timer = setTimeout(() => {
      speakChinese(card.hanzi)
    }, 300)
    return () => clearTimeout(timer)
  }, [card.id, faceMode])

  const playAudio = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card flip
    if (isPlaying) return

    setIsPlaying(true)
    await speakChinese(
      card.hanzi,
      undefined, // onStart
      () => setIsPlaying(false), // onEnd
      () => setIsPlaying(false) // onError
    )
  }

  // Determine what to show on the front based on faceMode
  const getFront = () => {
    switch (faceMode) {
      case "pinyin":
        return { main: card.pinyin, sub: null }
      case "hanzi":
        return { main: card.hanzi, sub: null }
      case "both":
        return { main: card.hanzi, sub: card.pinyin }
      case "english":
        return { main: card.english, sub: null }
      case "immersion":
        return { main: card.hanzi, sub: null }
      case "random":
        // This should be handled at the parent level
        return { main: card.hanzi, sub: card.pinyin }
      default:
        return { main: card.hanzi, sub: card.pinyin }
    }
  }

  const front = getFront()

  // Fetch character decomposition (cached by react-query)
  const [showDecomposition, setShowDecomposition] = useState(false)
  const { data: decomposition, isLoading: isLoadingDecomp } = useQuery({
    queryKey: ["decompose", card.hanzi],
    queryFn: async () => {
      const res = await fetch("/api/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hanzi: card.hanzi })
      })
      if (!res.ok) return null
      return res.json()
    },
    staleTime: Infinity, // Character decomposition never changes
    enabled: showDecomposition
  })

  // Compute actual SRS intervals for each quality button
  const cardSRS = {
    easeFactor: card.easeFactor ?? 2.5,
    interval: card.interval ?? 0,
    repetitions: card.repetitions ?? 0,
    state: (card.state ?? "NEW") as "NEW" | "LEARNING" | "REVIEW" | "LEARNED"
  }
  const intervalLabels = {
    again: formatInterval(previewInterval(cardSRS, SRSQuality.AGAIN)),
    hard: formatInterval(previewInterval(cardSRS, SRSQuality.HARD)),
    good: formatInterval(previewInterval(cardSRS, SRSQuality.GOOD)),
    easy: formatInterval(previewInterval(cardSRS, SRSQuality.EASY)),
  }

  const handleCardTap = () => {
    if (!isFlipped) {
      setIsFlipped(true)
      if (isNative()) {
        import("@capacitor/haptics").then(({ Haptics, ImpactStyle }) =>
          Haptics.impact({ style: ImpactStyle.Light })
        ).catch(() => {})
      }
    }
  }

  return (
    <div
      className="w-full max-w-md mx-auto"
      style={swipeStyle}
      {...swipeHandlers}
    >
      {!isFlipped ? (
        /* Front */
        <Card
          className="cursor-pointer active:scale-[0.98] transition-transform"
          onClick={handleCardTap}
          style={{ backgroundColor: swipeOverlay }}
        >
          <CardContent className="text-center py-8 sm:py-12 px-4">
            <div className="flex items-center justify-center gap-3">
              <p
                className={`font-bold ${
                  faceMode === "english" ? "text-xl md:text-2xl" : "text-3xl md:text-4xl"
                }`}
              >
                {front.main}
              </p>
              {faceMode !== "english" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={playAudio}
                  disabled={isPlaying}
                >
                  <Volume2 className={`h-5 w-5 ${isPlaying ? 'animate-pulse' : ''}`} />
                </Button>
              )}
            </div>
            {front.sub && (
              <p className="text-lg text-muted-foreground mt-2">{front.sub}</p>
            )}
            <p className="text-sm text-muted-foreground mt-6">
              Tap to flip
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Back — no absolute positioning, sizes to content naturally */
        <>
          <Card style={{ backgroundColor: swipeOverlay }}>
            <CardContent className="p-4 sm:p-6">
              <div className="text-center mb-3">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl sm:text-3xl font-bold break-words">{card.hanzi}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={playAudio}
                    disabled={isPlaying}
                  >
                    <Volume2 className={`h-4 w-4 ${isPlaying ? 'animate-pulse' : ''}`} />
                  </Button>
                </div>
                {showPinyin ? (
                  <p className="text-base sm:text-lg text-muted-foreground">{card.pinyin}</p>
                ) : (
                  <button
                    className="text-sm text-primary/60 hover:text-primary underline underline-offset-2"
                    onClick={() => setShowPinyin(true)}
                  >
                    tap for pinyin
                  </button>
                )}
              </div>

              <p className="text-lg sm:text-xl text-center mb-2">{card.english}</p>

              {card.notes && (
                <p className="text-sm text-muted-foreground text-center mb-2 line-clamp-2">
                  {card.notes}
                </p>
              )}

              <div className="flex flex-wrap gap-1 justify-center">
                <Badge variant="outline" className="text-xs">{card.type.toLowerCase()}</Badge>
                {card.lesson && (
                  <Badge variant="secondary" className="text-xs">L{card.lesson.number}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Answer buttons — directly below card, no overlap */}
          <div className="mt-2 sm:mt-3">
            <AnswerButtons
              onAnswer={onAnswer}
              disabled={isSubmitting}
              intervalLabels={intervalLabels}
            />
          </div>

          {/* Optional extras — compact row below buttons */}
          <div className="flex gap-2 mt-2">
            {!exampleSentence && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onGenerateExample?.()}
                disabled={isGenerating}
                className="flex-1 text-xs h-8"
              >
                {isGenerating ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Example
              </Button>
            )}
            {!showDecomposition ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDecomposition(true)}
                disabled={isLoadingDecomp}
                className="flex-1 text-xs h-8"
              >
                {isLoadingDecomp ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Puzzle className="h-3 w-3 mr-1" />
                )}
                Breakdown
              </Button>
            ) : null}
          </div>

          {/* Expandable content — shown only when requested */}
          {exampleSentence && (
            <div className="mt-2 p-3 bg-muted/50 rounded-lg text-center space-y-1">
              <p className="text-sm font-medium">{exampleSentence.sentence}</p>
              <p className="text-xs text-muted-foreground">{exampleSentence.pinyin}</p>
              <p className="text-xs">{exampleSentence.translation}</p>
            </div>
          )}

          {showDecomposition && decomposition && (
            <div className="mt-2 p-3 bg-muted/50 rounded-lg text-center space-y-1">
              <p className="text-sm font-medium">{decomposition.components}</p>
              <p className="text-xs text-muted-foreground">{decomposition.radicals}</p>
              <p className="text-xs text-muted-foreground italic">{decomposition.etymology}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
