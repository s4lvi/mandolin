"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Volume2 } from "lucide-react"
import type { Card as CardType } from "@/types"
import { speakChinese, preloadVoices } from "@/lib/speech"

interface CardItemProps {
  card: CardType
  onDelete?: (cardId: string) => void
  onTagClick?: (tagId: string, tagName: string) => void
}

const typeColors = {
  VOCABULARY: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50",
  GRAMMAR: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900/50",
  PHRASE: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900/50",
  IDIOM: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50"
}

export function CardItem({ card, onDelete, onTagClick }: CardItemProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const colorClass = typeColors[card.type] || "bg-white"

  // Preload voices on mount (important for iOS)
  useEffect(() => {
    preloadVoices()
  }, [])

  const playAudio = async () => {
    if (isPlaying) return

    setIsPlaying(true)
    await speakChinese(
      card.hanzi,
      undefined, // onStart
      () => setIsPlaying(false), // onEnd
      () => setIsPlaying(false) // onError
    )
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${colorClass}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold">{card.hanzi}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={playAudio}
                disabled={isPlaying}
                title="Play pronunciation"
              >
                <Volume2 className={`h-4 w-4 ${isPlaying ? 'animate-pulse' : ''}`} />
              </Button>
              <span className="text-sm text-muted-foreground">{card.pinyin}</span>
            </div>
            <p className="text-sm mb-2">{card.english}</p>
            {card.notes && (
              <p className="text-xs text-muted-foreground mb-2">{card.notes}</p>
            )}
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {card.type.toLowerCase()}
              </Badge>
              {card.lesson && (
                <Badge variant="secondary" className="text-xs">
                  Lesson {card.lesson.number}
                </Badge>
              )}
              {card.tags.map((cardTag) => (
                <Badge
                  key={cardTag.tagId}
                  variant="secondary"
                  className={`text-xs ${onTagClick ? "cursor-pointer hover:bg-primary hover:text-primary-foreground" : ""}`}
                  onClick={(e) => {
                    if (onTagClick) {
                      e.stopPropagation()
                      onTagClick(cardTag.tagId, cardTag.tag.name)
                    }
                  }}
                >
                  {cardTag.tag.name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-1 ml-2">
            <Link href={`/deck/${card.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(card.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
