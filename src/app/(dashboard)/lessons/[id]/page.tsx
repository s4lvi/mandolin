"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { ErrorBoundaryWithRouter as ErrorBoundary } from "@/components/error-boundary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { CardItem } from "@/components/cards/card-item"
import {
  BookOpen,
  ArrowLeft,
  Play,
  BarChart3,
  FileText,
  CheckCircle,
  ChevronDown
} from "lucide-react"
import { formatLessonTitle } from "@/lib/lesson-helpers"
import type { Card as CardType } from "@/types"

interface LessonProgress {
  currentPage: number
  totalPages: number
  completedAt: string | null
  isComplete: boolean
}

interface LessonDetail {
  id: string
  number: number
  title?: string
  date?: string
  notes?: string
  deckId: string
  createdAt: string
  cards: CardType[]
  lessonProgress: LessonProgress | null
}

async function fetchLessonDetail(id: string): Promise<LessonDetail> {
  const res = await fetch(`/api/lessons/${id}`)
  if (!res.ok) {
    throw new Error("Failed to fetch lesson")
  }
  return res.json()
}

export default function LessonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const lessonId = params.id as string
  const [notesOpen, setNotesOpen] = useState(false)

  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => fetchLessonDetail(lessonId),
    enabled: !!lessonId
  })

  if (error) {
    return (
      <ErrorBoundary>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Lesson not found</h3>
          <p className="text-muted-foreground mb-4">
            The lesson you're looking for doesn't exist or has been deleted.
          </p>
          <Link href="/lessons">
            <Button variant="outline">Back to Lessons</Button>
          </Link>
        </div>
      </ErrorBoundary>
    )
  }

  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading lesson...</p>
        </div>
      </ErrorBoundary>
    )
  }

  if (!lesson) {
    return null
  }

  const lessonProgress = lesson.lessonProgress
  const isComplete = lessonProgress?.isComplete
  const progressPercent = lessonProgress
    ? Math.round((lessonProgress.currentPage / lessonProgress.totalPages) * 100)
    : 0

  const getStatusLabel = () => {
    if (isComplete) return "Completed"
    if (lessonProgress) return "In Progress"
    return "Not Started"
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {formatLessonTitle(lesson.number, lesson.title)}
              </h1>
              <p className="text-muted-foreground">
                {lesson.cards.length} cards • {getStatusLabel()}
                {lesson.date && ` • ${new Date(lesson.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/lessons/${lesson.id}/learn`}>
              <Button>
                <Play className="h-4 w-4 mr-2" />
                {isComplete ? "Review Lesson" : lessonProgress ? "Continue" : "Start Lesson"}
              </Button>
            </Link>
          </div>
        </div>

        {/* Progress Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Lesson Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isComplete ? (
              <div className="flex items-center gap-4">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-lg font-medium text-green-600 dark:text-green-400">
                    Lesson Completed!
                  </p>
                  {lessonProgress?.completedAt && (
                    <p className="text-sm text-muted-foreground">
                      Completed on {new Date(lessonProgress.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ) : lessonProgress ? (
              <div className="flex items-center gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
                <div className="text-center px-4 py-2 bg-blue-50 dark:bg-blue-950/20 rounded flex-shrink-0">
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {lessonProgress.currentPage} / {lessonProgress.totalPages}
                  </div>
                  <div className="text-xs text-muted-foreground">pages</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    You haven't started this lesson yet
                  </p>
                </div>
                <Link href={`/lessons/${lesson.id}/learn`}>
                  <Button>
                    <Play className="h-4 w-4 mr-2" />
                    Start Lesson
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lesson Context - Collapsible */}
        {lesson.notes && (
          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Lesson Context
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                        notesOpen ? "rotate-180" : ""
                      }`}
                    />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{lesson.notes}</ReactMarkdown>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link href={`/lessons/${lesson.id}/learn`}>
            <Button variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              {isComplete ? "Review Lesson" : lessonProgress ? "Continue Lesson" : "Start Lesson"}
            </Button>
          </Link>
          <Link href={`/review?lessonId=${lesson.id}`}>
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Flashcard Review
            </Button>
          </Link>
          <Link href={`/deck?lessonId=${lesson.id}`}>
            <Button variant="outline">
              View All Cards
            </Button>
          </Link>
        </div>

        {/* Cards List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Cards in this lesson ({lesson.cards.length})
          </h2>

          {lesson.cards.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No cards in this lesson yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lesson.cards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  onDelete={() => {}}
                  onTagClick={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
