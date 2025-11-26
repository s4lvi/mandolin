"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Pencil, Trash2, Volume2, Star, MoreVertical } from "lucide-react"
import type { Card as CardType } from "@/types"
import { speakChinese, preloadVoices } from "@/lib/speech"
import { toast } from "sonner"
import { useToggleCardPriority } from "@/hooks/use-cards"

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
  const togglePriorityMutation = useToggleCardPriority()

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

  const togglePriority = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (togglePriorityMutation.isPending) return

    const newPriority = !card.isPriority

    try {
      await togglePriorityMutation.mutateAsync({
        cardId: card.id,
        isPriority: newPriority
      })
      toast.success(newPriority ? "Marked as priority" : "Removed from priority")
    } catch (error) {
      toast.error("Failed to update priority")
    }
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={togglePriority}
              disabled={togglePriorityMutation.isPending}
              title={card.isPriority ? "Remove from priority" : "Mark as priority"}
            >
              <Star
                className={`h-4 w-4 transition-colors ${
                  card.isPriority
                    ? 'fill-yellow-500 text-yellow-500'
                    : 'text-muted-foreground hover:text-yellow-500'
                } ${togglePriorityMutation.isPending ? 'opacity-50' : ''}`}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/deck/${card.id}`} className="cursor-pointer">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(card.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
