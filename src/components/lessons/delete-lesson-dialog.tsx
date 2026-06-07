"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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

export function DeleteLessonDialog({
  open,
  onClose,
  lessonId,
  lessonLabel,
  cardCount,
  onDeleted
}: DeleteLessonDialogProps) {
  const deleteMutation = useDeleteLesson()

  const handleDelete = async (deleteCards: boolean) => {
    try {
      const res = await deleteMutation.mutateAsync({ lessonId, deleteCards })
      toast.success(
        deleteCards
          ? `Deleted ${lessonLabel} and ${res.deletedCards} card${res.deletedCards === 1 ? "" : "s"}`
          : `Deleted ${lessonLabel}`
      )
      onClose()
      onDeleted?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete lesson")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {lessonLabel}?</DialogTitle>
          <DialogDescription>
            This lesson groups {cardCount} card{cardCount === 1 ? "" : "s"}. Choose what to remove.
            Cards that also belong to another lesson are always kept.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={deleteMutation.isPending}
            onClick={() => handleDelete(false)}
          >
            {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Remove lesson only (keep cards)
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            disabled={deleteMutation.isPending}
            onClick={() => handleDelete(true)}
          >
            {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete lesson and its cards
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
