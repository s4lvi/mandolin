"use client"

import { useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useLessons, useCreateLesson, useAssociateCardsWithLesson } from "@/hooks/use-lessons"
import { getNextLessonNumber } from "@/lib/lesson-helpers"
import { toast } from "sonner"

interface LessonAssociationModalProps {
  open: boolean
  onClose: () => void
  cardIds: string[]
  cardCount: number
  onSuccess?: (lessonId: string, lessonTitle: string) => void
  defaultLessonNumber?: number
  defaultLessonTitle?: string
  mode?: "add" | "create" | "auto" // Force a specific mode or auto-select
}

export function LessonAssociationModal({
  open,
  onClose,
  cardIds,
  cardCount,
  onSuccess,
  defaultLessonNumber,
  defaultLessonTitle,
  mode: forcedMode = "auto"
}: LessonAssociationModalProps) {
  const [mode, setMode] = useState<"existing" | "new">(
    forcedMode === "create" ? "new" : "existing"
  )
  const [selectedLessonId, setSelectedLessonId] = useState<string>("")
  const [newLessonNumber, setNewLessonNumber] = useState("")
  const [newLessonTitle, setNewLessonTitle] = useState("")
  const [newLessonNotes, setNewLessonNotes] = useState("")

  const { data: lessons, isLoading: lessonsLoading } = useLessons()
  const createLessonMutation = useCreateLesson()
  const associateMutation = useAssociateCardsWithLesson()

  // Set default values when modal opens or when lessons load
  useEffect(() => {
    if (open && lessons && lessons.length > 0 && !selectedLessonId) {
      // Default to first lesson for "existing" mode
      setSelectedLessonId(lessons[0].id)
    }

    // Set default values for new lesson if provided
    if (open && defaultLessonNumber) {
      setNewLessonNumber(defaultLessonNumber.toString())
    } else if (open && lessons) {
      // Calculate next lesson number
      const nextNumber = getNextLessonNumber(lessons)
      setNewLessonNumber(nextNumber.toString())
    }

    if (open && defaultLessonTitle) {
      setNewLessonTitle(defaultLessonTitle)
    }
  }, [open, lessons, selectedLessonId, defaultLessonNumber, defaultLessonTitle])

  // Auto-switch to "new" mode if no existing lessons
  useEffect(() => {
    if (open && lessons && lessons.length === 0) {
      setMode("new")
    }
  }, [open, lessons])

  const handleAssociate = async () => {
    try {
      let lessonId = selectedLessonId
      let lessonTitle = ""

      // If creating new lesson, create it first
      if (mode === "new") {
        if (!newLessonNumber) {
          toast.error("Please enter a lesson number")
          return
        }

        const lesson = await createLessonMutation.mutateAsync({
          number: parseInt(newLessonNumber),
          title: newLessonTitle || undefined,
          notes: newLessonNotes || undefined
        })

        lessonId = lesson.id
        lessonTitle = lesson.title || `Lesson ${lesson.number}`
      } else {
        // Find selected lesson title
        const lesson = lessons && Array.isArray(lessons) ? lessons.find((l) => l.id === lessonId) : null
        lessonTitle = lesson?.title || `Lesson ${lesson?.number}`
      }

      // Associate cards with lesson
      const result = await associateMutation.mutateAsync({
        cardIds,
        lessonId
      })

      toast.success(`${result.updatedCount} cards added to ${result.lessonTitle}`)

      if (onSuccess) {
        onSuccess(lessonId, lessonTitle)
      }

      onClose()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to associate cards with lesson"
      )
    }
  }

  const handleSkip = () => {
    onClose()
  }

  const isLoading = createLessonMutation.isPending || associateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Associate Cards with Lesson</DialogTitle>
          <DialogDescription>
            {cardCount} card{cardCount !== 1 ? "s" : ""} created successfully. Would you like to
            organize them into a lesson?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {lessonsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : lessons && Array.isArray(lessons) && lessons.length > 0 ? (
            <>
              {/* Mode Selection (only show if mode is auto) */}
              {forcedMode === "auto" && (
                <div className="space-y-2">
                  <Label>Choose Option</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={mode === "existing" ? "default" : "outline"}
                      onClick={() => setMode("existing")}
                      className="flex-1"
                      type="button"
                    >
                      Add to Existing
                    </Button>
                    <Button
                      variant={mode === "new" ? "default" : "outline"}
                      onClick={() => setMode("new")}
                      className="flex-1"
                      type="button"
                    >
                      Create New
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing Lesson Selection */}
              {mode === "existing" && (
                <div className="space-y-2">
                  <Label htmlFor="lesson-select">Select Lesson</Label>
                  <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                    <SelectTrigger id="lesson-select">
                      <SelectValue placeholder="Choose a lesson" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessons.map((lesson) => (
                        <SelectItem key={lesson.id} value={lesson.id}>
                          <div className="flex items-center justify-between gap-4">
                            <span>
                              Lesson {lesson.number}
                              {lesson.title && `: ${lesson.title}`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {lesson._count?.cards || 0} cards
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No existing lessons. Create your first lesson below.
            </div>
          )}

          {/* New Lesson Form */}
          {mode === "new" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lesson-number">Lesson Number *</Label>
                  <Input
                    id="lesson-number"
                    type="number"
                    placeholder="e.g., 1"
                    value={newLessonNumber}
                    onChange={(e) => setNewLessonNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson-title">Lesson Title</Label>
                  <Input
                    id="lesson-title"
                    placeholder="e.g., Greetings"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson-notes">Lesson Notes (Optional)</Label>
                <Textarea
                  id="lesson-notes"
                  placeholder="Add context, learning objectives, or notes about this lesson..."
                  value={newLessonNotes}
                  onChange={(e) => setNewLessonNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip} disabled={isLoading} type="button">
            Skip
          </Button>
          <Button onClick={handleAssociate} disabled={isLoading} type="button">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : mode === "new" ? (
              "Create & Associate"
            ) : (
              "Associate Cards"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
