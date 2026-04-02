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

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className="relative cursor-pointer perspective-1000"
        onClick={() => {
          setIsFlipped(!isFlipped)
          // Light haptic on card flip
          if (isNative()) {
            import("@capacitor/haptics").then(({ Haptics, ImpactStyle }) =>
              Haptics.impact({ style: ImpactStyle.Light })
            ).catch(() => {})
          }
        }}
        style={{ perspective: "1000px", ...swipeStyle, backgroundColor: swipeOverlay }}
        {...swipeHandlers}
      >
        <div
          className={`relative transition-transform duration-500 transform-style-preserve-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0)"
          }}
        >
          {/* Front */}
          <Card
            className={`min-h-[180px] sm:min-h-[250px] flex items-center justify-center ${
              isFlipped ? "invisible" : ""
            }`}
            style={{
              backfaceVisibility: "hidden"
            }}
          >
            <CardContent className="text-center p-4 sm:p-8">
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
                    title="Play pronunciation"
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

          {/* Back */}
          <Card
            className={`min-h-[180px] sm:min-h-[250px] absolute inset-0 ${
              isFlipped ? "" : "invisible"
            }`}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)"
            }}
          >
            <CardContent className="p-4 sm:p-6 flex flex-col">
              <div className="flex-1">
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-3xl font-bold break-words">{card.hanzi}</p>
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
                  {showPinyin ? (
                    <p className="text-lg text-muted-foreground break-words">{card.pinyin}</p>
                  ) : (
                    <button
                      className="text-sm text-primary/60 hover:text-primary underline underline-offset-2"
                      onClick={(e) => { e.stopPropagation(); setShowPinyin(true) }}
                    >
                      tap for pinyin
                    </button>
                  )}
                </div>
                <div className="text-center mb-4">
                  <p className="text-xl break-words">{card.english}</p>
                </div>
                {card.notes && (
                  <p className="text-sm text-muted-foreground text-center mb-4 break-words">
                    {card.notes}
                  </p>
                )}

                {/* Example sentence for any card */}
                {(
                  <div className="mt-4 pt-4 border-t">
                    {exampleSentence ? (
                      <div className="text-center space-y-1">
                        <p className="text-base font-medium break-words">
                          {exampleSentence.sentence}
                        </p>
                        <p className="text-xs text-muted-foreground break-words">
                          {exampleSentence.pinyin}
                        </p>
                        <p className="text-xs break-words">{exampleSentence.translation}</p>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onGenerateExample?.()
                        }}
                        disabled={isGenerating}
                        className="w-full"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Example
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {/* Character decomposition */}
                <div className="mt-4 pt-4 border-t">
                  {showDecomposition && decomposition ? (
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium">{decomposition.components}</p>
                      <p className="text-xs text-muted-foreground">{decomposition.radicals}</p>
                      <p className="text-xs text-muted-foreground italic">{decomposition.etymology}</p>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDecomposition(true)
                      }}
                      disabled={isLoadingDecomp}
                      className="w-full text-xs"
                    >
                      {isLoadingDecomp ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Puzzle className="h-3 w-3 mr-1" />
                      )}
                      Character Breakdown
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 justify-center mt-4">
                  <Badge variant="outline">{card.type.toLowerCase()}</Badge>
                  {card.lesson && (
                    <Badge variant="secondary">Lesson {card.lesson.number}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Answer buttons */}
      {isFlipped && (
        <div className="mt-3 md:mt-6">
          <AnswerButtons
            onAnswer={onAnswer}
            disabled={isSubmitting}
            intervalLabels={intervalLabels}
          />
        </div>
      )}
    </div>
  )
}
