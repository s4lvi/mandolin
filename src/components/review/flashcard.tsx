"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles } from "lucide-react"
import type { Card as CardType, FaceMode, ExampleSentence } from "@/types"

interface FlashcardProps {
  card: CardType
  faceMode: FaceMode
  onCorrect: () => void
  onIncorrect: () => void
  onGenerateExample?: () => void
  exampleSentence?: ExampleSentence
  isGenerating?: boolean
}

export function Flashcard({
  card,
  faceMode,
  onCorrect,
  onIncorrect,
  onGenerateExample,
  exampleSentence,
  isGenerating
}: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

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
      case "random":
        // This should be handled at the parent level
        return { main: card.hanzi, sub: card.pinyin }
      default:
        return { main: card.hanzi, sub: card.pinyin }
    }
  }

  const front = getFront()
  const isGrammarCard = card.type === "GRAMMAR"

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className="relative cursor-pointer perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
        style={{ perspective: "1000px" }}
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
            className={`min-h-[300px] flex items-center justify-center ${
              isFlipped ? "invisible" : ""
            }`}
            style={{
              backfaceVisibility: "hidden"
            }}
          >
            <CardContent className="text-center p-8">
              <p
                className={`font-bold ${
                  faceMode === "english" ? "text-2xl" : "text-4xl"
                }`}
              >
                {front.main}
              </p>
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
            className={`min-h-[300px] absolute inset-0 ${
              isFlipped ? "" : "invisible"
            }`}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)"
            }}
          >
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex-1">
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold">{card.hanzi}</p>
                  <p className="text-lg text-muted-foreground">{card.pinyin}</p>
                </div>
                <div className="text-center mb-4">
                  <p className="text-xl">{card.english}</p>
                </div>
                {card.notes && (
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    {card.notes}
                  </p>
                )}

                {/* Example sentence for grammar cards */}
                {isGrammarCard && (
                  <div className="mt-4 pt-4 border-t">
                    {exampleSentence ? (
                      <div className="text-center space-y-1">
                        <p className="text-lg font-medium">
                          {exampleSentence.sentence}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {exampleSentence.pinyin}
                        </p>
                        <p className="text-sm">{exampleSentence.translation}</p>
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
        <div className="flex gap-4 mt-6">
          <Button
            variant="outline"
            className="flex-1 border-red-500 text-red-500 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation()
              setIsFlipped(false)
              onIncorrect()
            }}
          >
            Incorrect
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={(e) => {
              e.stopPropagation()
              setIsFlipped(false)
              onCorrect()
            }}
          >
            Correct
          </Button>
        </div>
      )}
    </div>
  )
}
