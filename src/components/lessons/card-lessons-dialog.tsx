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
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { useLessons, useSetCardLessons } from "@/hooks/use-lessons"
import { formatLessonTitle } from "@/lib/lesson-helpers"
import { toast } from "sonner"

interface CardLessonsDialogProps {
  open: boolean
  onClose: () => void
  cardId: string
  cardLabel: string
  currentLessonIds: string[]
}

// Lets a user put a single card into any number of lessons at once.
export function CardLessonsDialog({
  open,
  onClose,
  cardId,
  cardLabel,
  currentLessonIds
}: CardLessonsDialogProps) {
  const { data: lessons, isLoading } = useLessons()
  const setMutation = useSetCardLessons()
  const [selected, setSelected] = useState<string[]>(currentLessonIds)

  const toggle = (lessonId: string) => {
    setSelected((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    )
  }

  const handleSave = async () => {
    try {
      await setMutation.mutateAsync({ cardId, lessonIds: selected })
      toast.success("Lessons updated")
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update lessons")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lessons for {cardLabel}</DialogTitle>
          <DialogDescription>
            Select every lesson this card should belong to. A card can be in multiple lessons.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : !lessons || lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No lessons yet.</p>
          ) : (
            lessons.map((lesson) => {
              const checked = selected.includes(lesson.id)
              return (
                <label
                  key={lesson.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(lesson.id)} />
                  <span className="text-sm flex-1 min-w-0 truncate">
                    {formatLessonTitle(lesson.number, lesson.title)}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {lesson._count?.cards ?? 0} cards
                  </span>
                </label>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={setMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={setMutation.isPending}>
            {setMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
