"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useCreateLesson, useLessons } from "@/hooks/use-lessons"
import { getNextLessonNumber } from "@/lib/lesson-helpers"
import { toast } from "sonner"

interface CreateLessonModalProps {
  open: boolean
  onClose: () => void
}

export function CreateLessonModal({ open, onClose }: CreateLessonModalProps) {
  const router = useRouter()
  const { data: lessons } = useLessons()
  const createLessonMutation = useCreateLesson()

  const nextLessonNumber = lessons ? getNextLessonNumber(lessons) : 1

  const [lessonNumber, setLessonNumber] = useState(nextLessonNumber.toString())
  const [lessonTitle, setLessonTitle] = useState("")
  const [lessonNotes, setLessonNotes] = useState("")

  // Update lesson number when lessons data changes
  useState(() => {
    if (lessons) {
      setLessonNumber(getNextLessonNumber(lessons).toString())
    }
  })

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (createLessonMutation.isPending) return
    if (!lessonNumber) {
      toast.error("Please enter a lesson number")
      return
    }

    try {
      const lesson = await createLessonMutation.mutateAsync({
        number: parseInt(lessonNumber),
        title: lessonTitle || undefined,
        notes: lessonNotes || undefined
      })

      toast.success("Lesson created successfully")
      onClose()

      // Reset form
      setLessonTitle("")
      setLessonNotes("")
      setLessonNumber((parseInt(lessonNumber) + 1).toString())

      // Navigate to lesson detail page
      router.push(`/lessons/${lesson.id}`)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Failed to create lesson")
      }
    }
  }

  const handleClose = () => {
    onClose()
    // Reset form
    setLessonTitle("")
    setLessonNotes("")
    if (lessons) {
      setLessonNumber(getNextLessonNumber(lessons).toString())
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Lesson</DialogTitle>
          <DialogDescription>
            Create an empty lesson to organize your cards. You can add cards later from the deck page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="contents">
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-number">
              Lesson Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lesson-number"
              type="number"
              min="1"
              value={lessonNumber}
              onChange={(e) => setLessonNumber(e.target.value)}
              placeholder="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-title">Lesson Title (Optional)</Label>
            <Input
              id="lesson-title"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="e.g., Shopping Vocabulary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-notes">Lesson Notes (Optional)</Label>
            <Textarea
              id="lesson-notes"
              value={lessonNotes}
              onChange={(e) => setLessonNotes(e.target.value)}
              placeholder="Add notes about what this lesson covers..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              These notes will be used to generate interactive lesson content.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={createLessonMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createLessonMutation.isPending || !lessonNumber}
          >
            {createLessonMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {createLessonMutation.isPending ? "Creating..." : "Create Lesson"}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
