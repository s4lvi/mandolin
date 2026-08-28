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
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Loader2, Share2, X } from "lucide-react"
import { usePublishLesson } from "@/hooks/use-community"
import { toast } from "sonner"

const HSK_LEVELS = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"]

interface PublishLessonDialogProps {
  open: boolean
  onClose: () => void
  lessonId: string
  defaultTitle: string
  cardCount: number
}

export function PublishLessonDialog({
  open,
  onClose,
  lessonId,
  defaultTitle,
  cardCount
}: PublishLessonDialogProps) {
  const publishMutation = usePublishLesson()
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState("")
  const [level, setLevel] = useState<string>("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags([...tags, t])
    }
    setTagInput("")
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (publishMutation.isPending) return
    if (!title.trim()) {
      toast.error("Please enter a title")
      return
    }
    try {
      await publishMutation.mutateAsync({
        lessonId,
        title: title.trim(),
        description: description.trim() || undefined,
        level: level || undefined,
        tags
      })
      toast.success("Lesson published to the community!")
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish to Community</DialogTitle>
          <DialogDescription>
            Share this lesson&apos;s {cardCount} cards with other learners. They can add it to
            their own deck.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="contents">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="publish-title">Title *</Label>
            <Input
              id="publish-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Everyday Greetings"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="publish-desc">Description</Label>
            <Textarea
              id="publish-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this lesson cover?"
              className="min-h-[72px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a level (optional)" />
              </SelectTrigger>
              <SelectContent>
                {HSK_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publish-tags">Tags</Label>
            <Input
              id="publish-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault()
                  addTag()
                }
              }}
              onBlur={addTag}
              placeholder="Type a tag and press Enter"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="hover:text-destructive p-1 -m-1"
                      aria-label={`Remove tag ${t}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={publishMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={publishMutation.isPending || !title.trim()}>
            {publishMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            Publish
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
