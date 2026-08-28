"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLessons, type LessonWithCount } from "@/hooks/use-lessons"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { ArrowLeft, Loader2, GraduationCap, ChevronUp, ChevronDown, X } from "lucide-react"
import { toast } from "sonner"

export default function CreateCoursePage() {
  const router = useRouter()
  const { data: lessons, isLoading: lessonsLoading } = useLessons()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [level, setLevel] = useState("1")
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

  const toggleLesson = (lessonId: string) => {
    setSelectedLessonIds(prev =>
      prev.includes(lessonId)
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    )
  }

  const moveLesson = (index: number, direction: -1 | 1) => {
    setSelectedLessonIds(prev => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a course title")
      return
    }
    if (selectedLessonIds.length === 0) {
      toast.error("Select at least one lesson")
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch("/api/courses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          level: parseInt(level),
          lessonIds: selectedLessonIds
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create course")
      }

      const data = await res.json()
      toast.success("Course created! It's private — publish it from the course page to share.")
      router.push(`/courses/${data.course.slug}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create course")
    } finally {
      setIsCreating(false)
    }
  }

  const userLessons: LessonWithCount[] = (lessons || []).filter(
    (l) => (l._count?.cards ?? 0) > 0
  )
  const lessonById = new Map(userLessons.map((l) => [l.id, l]))
  const selectedLessons = selectedLessonIds
    .map((id) => lessonById.get(id))
    .filter((l): l is LessonWithCount => !!l)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/courses")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Courses
      </Button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Create a Course</h1>
        <p className="text-muted-foreground">
          Bundle your lessons into a structured course. It stays private until you choose to publish it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Course Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Beginner Conversational Chinese"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What will learners gain from this course?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Difficulty Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">HSK 1 — Beginner</SelectItem>
                <SelectItem value="2">HSK 2 — Elementary</SelectItem>
                <SelectItem value="3">HSK 3 — Intermediate</SelectItem>
                <SelectItem value="4">HSK 4 — Upper Intermediate</SelectItem>
                <SelectItem value="5">HSK 5 — Advanced</SelectItem>
                <SelectItem value="6">HSK 6 — Mastery</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Course outline — selected lessons in their final order */}
      {selectedLessons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Course Outline</CardTitle>
            <CardDescription>
              Lessons run in this order. Use the arrows to rearrange.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedLessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-primary bg-primary/5"
                >
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      Lesson {lesson.number}{lesson.title ? `: ${lesson.title}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lesson._count?.cards || 0} cards
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="Move lesson up"
                      disabled={index === 0}
                      onClick={() => moveLesson(index, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="Move lesson down"
                      disabled={index === selectedLessons.length - 1}
                      onClick={() => moveLesson(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="Remove lesson from course"
                      onClick={() => toggleLesson(lesson.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Select Lessons</CardTitle>
          <CardDescription>
            Tap to add lessons to the course. New lessons are appended to the end.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lessonsLoading ? (
            <p className="text-muted-foreground text-center py-4">Loading lessons...</p>
          ) : userLessons.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No lessons with cards available. Upload some notes first.
            </p>
          ) : (
            <div className="space-y-2">
              {userLessons.map((lesson) => {
                const isSelected = selectedLessonIds.includes(lesson.id)

                return (
                  <div
                    key={lesson.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleLesson(lesson.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleLesson(lesson.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        Lesson {lesson.number}{lesson.title ? `: ${lesson.title}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lesson._count?.cards || 0} cards
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLessonIds.length > 0 && (
        <div className="sticky bottom-20 lg:bottom-4 z-10">
          <div className="bg-gradient-to-t from-background via-background to-transparent pt-4">
            <Button
              className="w-full h-12"
              onClick={handleCreate}
              disabled={isCreating || !title.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Create Course ({selectedLessonIds.length} lessons)
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
