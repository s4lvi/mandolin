"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Volume2, Eye, EyeOff } from "lucide-react"
import { speakChinese } from "@/lib/speech"

interface FlashcardSegmentProps {
  hanzi: string
  pinyin: string
  english: string
  notes?: string
}

export function FlashcardSegment({
  hanzi,
  pinyin,
  english,
  notes
}: FlashcardSegmentProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleSpeak = async () => {
    setIsPlaying(true)
    await speakChinese(hanzi)
    setIsPlaying(false)
  }

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="text-4xl font-bold">{hanzi}</div>

          {isRevealed ? (
            <div className="space-y-2">
              <div className="text-lg text-muted-foreground">{pinyin}</div>
              <div className="text-xl font-medium">{english}</div>
              {notes && (
                <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted rounded">
                  {notes}
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">Click to reveal meaning</div>
          )}

          <div className="flex justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSpeak}
              disabled={isPlaying}
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Speak
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRevealed(!isRevealed)}
            >
              {isRevealed ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Reveal
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
