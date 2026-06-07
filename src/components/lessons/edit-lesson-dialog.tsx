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
  initialTitle?: string | null
  initialNotes?: string | null
}

export function EditLessonDialog({
  open,
  onClose,
  lessonId,
  initialTitle,
  initialNotes
}: EditLessonDialogProps) {
  const updateMutation = useUpdateLesson()
  const [title, setTitle] = useState(initialTitle ?? "")
  const [notes, setNotes] = useState(initialNotes ?? "")

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        lessonId,
        data: { title: title.trim() || undefined, notes: notes.trim() || undefined }
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
          <DialogDescription>Rename this lesson or update its notes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
