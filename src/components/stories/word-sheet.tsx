"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { useCreateCard } from "@/hooks/use-cards"
import { useSpeak } from "@/hooks/use-speak"
import { toast } from "sonner"
import { CheckCircle, Loader2, Plus, Volume2 } from "lucide-react"
import type { StoryWordInfo } from "./story-words"

interface WordSheetProps {
  word: StoryWordInfo | null
  onClose: () => void
}

export function WordSheet({ word, onClose }: WordSheetProps) {
  const createCard = useCreateCard()
  const { speak, isPlaying } = useSpeak()

  const lessonNumbers = word?.card?.lessons?.map((l) => l.lesson.number).sort((a, b) => a - b) ?? []

  const addToDeck = async () => {
    if (!word) return
    try {
      await createCard.mutateAsync({
        hanzi: word.hanzi,
        pinyin: word.pinyin,
        english: word.english,
        type: "VOCABULARY"
      })
      toast.success(`Added ${word.hanzi} to your deck`)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add card")
    }
  }

  return (
    <Dialog open={!!word} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        {word && (
          <>
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold flex items-center gap-2">
                {word.hanzi}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => void speak(word.hanzi)}
                  disabled={isPlaying}
                  aria-label="Play pronunciation"
                >
                  <Volume2 className={`h-4 w-4 ${isPlaying ? "animate-pulse text-primary" : ""}`} />
                </Button>
              </DialogTitle>
              <DialogDescription className="text-base">
                <span className="block text-muted-foreground">{word.pinyin}</span>
                <span className="block text-foreground">{word.english}</span>
              </DialogDescription>
            </DialogHeader>

            {word.card ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                In your deck
                {lessonNumbers.length > 0 && (
                  <> · Lesson {lessonNumbers.join(", ")}</>
                )}
              </p>
            ) : (
              <Button onClick={addToDeck} disabled={createCard.isPending} className="w-full">
                {createCard.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add to deck
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
