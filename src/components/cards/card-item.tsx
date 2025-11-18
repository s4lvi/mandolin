"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import type { Card as CardType } from "@/types"

interface CardItemProps {
  card: CardType
  onDelete?: (cardId: string) => void
}

export function CardItem({ card, onDelete }: CardItemProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold">{card.hanzi}</span>
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
                <Badge key={cardTag.tagId} variant="secondary" className="text-xs">
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
