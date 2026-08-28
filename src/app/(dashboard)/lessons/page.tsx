"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLessons, type LessonWithCount } from "@/hooks/use-lessons"
import { isUserCreatedLesson, lessonSourceLabel } from "@/lib/lesson-helpers"
import { ErrorBoundaryWithRouter as ErrorBoundary } from "@/components/error-boundary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, ArrowRight, Play, Plus, Upload, CheckCircle, Search } from "lucide-react"
import { LessonListSkeleton } from "@/components/ui/skeleton"
import { CreateLessonModal } from "@/components/lessons/create-lesson-modal"
import { LearnTabs } from "@/components/layout/learn-tabs"

function LessonCard({ lesson }: { lesson: LessonWithCount }) {
  const router = useRouter()
  const cardCount = lesson._count?.cards || 0
  const lessonProgress = lesson.lessonProgress
  const isComplete = lessonProgress?.isComplete
  const progressPercent = lessonProgress
    ? Math.round((lessonProgress.currentPage / lessonProgress.totalPages) * 100)
    : 0
  const sourceLabel = lessonSourceLabel(lesson)
  const detailHref = `/lessons/${lesson.id}`
  const learnHref = `/lessons/${lesson.id}/learn`

  // The whole card is clickable (client navigation) without wrapping the inner
  // buttons in a Link, which would nest interactive elements.
  const open = () => router.push(detailHref)

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={`Lesson ${lesson.number}${lesson.title ? `: ${lesson.title}` : ""}`}
      className="hover:shadow-md transition-shadow cursor-pointer h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={open}
      onKeyDown={(e) => {
        // Only the card itself; inner buttons handle their own Enter/Space
        if (e.target !== e.currentTarget) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          open()
        }
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2 gap-2">
          <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
            Lesson {lesson.number}
            {sourceLabel && (
              <Badge variant="outline" className="text-xs font-medium">
                {sourceLabel}
              </Badge>
            )}
          </CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {cardCount} {cardCount === 1 ? "card" : "cards"}
          </Badge>
        </div>
        {lesson.title && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {lesson.title}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {lesson.date && (
          <p className="text-xs text-muted-foreground">
            {new Date(lesson.date).toLocaleDateString()}
          </p>
        )}

        {cardCount > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs items-center">
              <span className="text-muted-foreground">
                {isComplete ? (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    Completed
                  </span>
                ) : lessonProgress ? (
                  `Page ${lessonProgress.currentPage} of ${lessonProgress.totalPages}`
                ) : (
                  "Not started"
                )}
              </span>
              {lessonProgress && !isComplete && (
                <span className="font-medium">{progressPercent}%</span>
              )}
            </div>
            {lessonProgress && !isComplete && (
              <Progress value={progressPercent} className="h-2" />
            )}
            {isComplete && <Progress value={100} className="h-2" />}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation()
              router.push(learnHref)
            }}
          >
            <Play className="h-3 w-3 mr-1" />
            {isComplete ? "Review" : lessonProgress ? "Continue" : "Start"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Open lesson"
            onClick={(e) => {
              e.stopPropagation()
              router.push(detailHref)
            }}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LessonsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [search, setSearch] = useState("")

  const { data: lessons, isLoading } = useLessons()

  const list = Array.isArray(lessons) ? lessons : []
  // Only offer a search box once the list is long enough to need one
  const showSearch = list.length > 6
  const q = search.trim().toLowerCase()
  const matches = (l: LessonWithCount) =>
    !q ||
    `lesson ${l.number}`.includes(q) ||
    String(l.number) === q ||
    (l.title ?? "").toLowerCase().includes(q)
  const visible = showSearch ? list.filter(matches) : list
  const ownLessons = visible.filter(isUserCreatedLesson)
  const importedLessons = visible.filter((l) => !isUserCreatedLesson(l))

  return (
    <ErrorBoundary>
      <div className="space-y-6">

      <LearnTabs />

      {/* My Lessons section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Lessons</h1>
          <p className="text-muted-foreground">
            Your uploaded notes and custom lessons
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Lesson
          </Button>
          <Link href="/upload">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Notes
            </Button>
          </Link>
        </div>
      </div>

      {showSearch && (
        <div className="sticky top-10 lg:top-16 z-10 -mx-3 px-3 py-2 lg:-mx-4 lg:px-4 bg-background/95 backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search lessons by number or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search lessons"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <LessonListSkeleton />
      ) : list.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No lessons yet</h3>
          <p className="text-muted-foreground mb-4">
            Upload your first lesson notes to get started
          </p>
          <Link href="/upload">
            <Button>Upload Notes</Button>
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No lessons match &ldquo;{search.trim()}&rdquo;
        </p>
      ) : (
        <>
          {ownLessons.length > 0 && (
            <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ownLessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          )}

          {importedLessons.length > 0 && (
            <>
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  From courses &amp; community
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {importedLessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <CreateLessonModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
    </ErrorBoundary>
  )
}
