"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"
import { useDeleteLesson } from "@/hooks/use-lessons"
import { toast } from "sonner"

interface DeleteLessonDialogProps {
  open: boolean
  onClose: () => void
  lessonId: string
  lessonLabel: string
  cardCount: number
  onDeleted?: () => void
}

type CardChoice = "keep" | "delete"

export function DeleteLessonDialog({
  open,
  onClose,
  lessonId,
  lessonLabel,
  cardCount,
  onDeleted
}: DeleteLessonDialogProps) {
  const deleteMutation = useDeleteLesson()
  const [cardChoice, setCardChoice] = useState<CardChoice>("keep")

  const cardsLabel = `${cardCount} card${cardCount === 1 ? "" : "s"}`

  const handleClose = () => {
    if (deleteMutation.isPending) return
    setCardChoice("keep")
    onClose()
  }

  const handleDelete = async () => {
    const deleteCards = cardChoice === "delete"
    try {
      const res = await deleteMutation.mutateAsync({ lessonId, deleteCards })
      toast.success(
        deleteCards
          ? `Deleted ${lessonLabel} and ${res.deletedCards} card${res.deletedCards === 1 ? "" : "s"}`
          : `Deleted ${lessonLabel} (${cardsLabel} kept in your deck)`
      )
      setCardChoice("keep")
      onClose()
      onDeleted?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete lesson")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {lessonLabel}?</DialogTitle>
          <DialogDescription>
            This lesson groups {cardsLabel}. Choose what happens to them.
            Cards that also belong to another lesson are always kept.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={cardChoice}
          onValueChange={(v) => setCardChoice(v as CardChoice)}
          disabled={deleteMutation.isPending}
          className="gap-3"
        >
          <div className="flex items-start gap-3 rounded-md border p-3">
            <RadioGroupItem value="keep" id="delete-lesson-keep" className="mt-0.5" />
            <Label htmlFor="delete-lesson-keep" className="flex flex-col gap-1 cursor-pointer font-normal">
              <span className="font-medium">Keep the {cardsLabel} in my deck</span>
              <span className="text-xs text-muted-foreground">
                Only the lesson grouping is removed. Recommended.
              </span>
            </Label>
          </div>
          <div className="flex items-start gap-3 rounded-md border p-3">
            <RadioGroupItem value="delete" id="delete-lesson-cards" className="mt-0.5" />
            <Label htmlFor="delete-lesson-cards" className="flex flex-col gap-1 cursor-pointer font-normal">
              <span className="font-medium text-destructive">Also delete the {cardsLabel}</span>
              <span className="text-xs text-muted-foreground">
                Removes them from your deck along with their review history. Cannot be undone.
              </span>
            </Label>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {cardChoice === "delete" ? "Delete lesson and cards" : "Delete lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
