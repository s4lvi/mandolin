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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useUpdateLesson } from "@/hooks/use-lessons"
import { toast } from "sonner"

interface EditLessonDialogProps {
  open: boolean
  onClose: () => void
  lessonId: string
  initialNumber: number
  initialTitle?: string | null
  initialNotes?: string | null
  /** Numbers already used by other lessons in the deck (excluding this one). */
  takenNumbers: number[]
}

export function EditLessonDialog({
  open,
  onClose,
  lessonId,
  initialNumber,
  initialTitle,
  initialNotes,
  takenNumbers
}: EditLessonDialogProps) {
  const updateMutation = useUpdateLesson()
  const [number, setNumber] = useState(String(initialNumber))
  const [title, setTitle] = useState(initialTitle ?? "")
  const [notes, setNotes] = useState(initialNotes ?? "")

  const taken = new Set(takenNumbers)
  const parsedNumber = Number(number)
  const numberValid = Number.isInteger(parsedNumber) && parsedNumber >= 1
  const numberTaken = numberValid && parsedNumber !== initialNumber && taken.has(parsedNumber)
  const numberError = !numberValid
    ? "Enter a whole number (1 or higher)"
    : numberTaken
      ? `Lesson ${parsedNumber} already exists`
      : null

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (numberError || updateMutation.isPending) return
    try {
      await updateMutation.mutateAsync({
        lessonId,
        data: {
          number: parsedNumber,
          title: title.trim() || undefined,
          notes: notes.trim() || undefined
        }
      })
      toast.success("Lesson updated")
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update lesson")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit lesson</DialogTitle>
          <DialogDescription>Rename, renumber, or update this lesson&apos;s notes.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="contents">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-number">Lesson number</Label>
            <Input
              id="lesson-number"
              type="number"
              min={1}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              aria-invalid={!!numberError}
            />
            {numberError && <p className="text-xs text-destructive">{numberError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Title</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lesson title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-notes">Notes</Label>
            <Textarea
              id="lesson-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context used to generate the interactive lesson"
              className="min-h-[100px] max-h-[45vh] overflow-y-auto"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending || !!numberError}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
