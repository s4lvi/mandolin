"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ErrorBoundaryWithRouter as ErrorBoundary } from "@/components/error-boundary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CardItem } from "@/components/cards/card-item"
import {
  BookOpen,
  ArrowLeft,
  Play,
  BarChart3,
  Calendar,
  FileText,
  Edit
} from "lucide-react"
import {
  calculateLessonProgress,
  formatLessonTitle,
  getLessonStatusLabel,
  estimateLessonTime
} from "@/lib/lesson-helpers"
import type { Card as CardType } from "@/types"

interface LessonDetail {
  id: string
  number: number
  title?: string
  date?: string
  notes?: string
  deckId: string
  createdAt: string
  cards: CardType[]
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

  const progress = calculateLessonProgress(lesson.cards)
  const statusLabel = getLessonStatusLabel(progress)
  const estimatedMinutes = estimateLessonTime(progress)

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
                {progress.total} cards • {statusLabel}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/review?lessonId=${lesson.id}`}>
              <Button>
                <Play className="h-4 w-4 mr-2" />
                Start Review
              </Button>
            </Link>
          </div>
        </div>

        {/* Lesson Info Card */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Progress Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Mastery</span>
                  <span className="font-medium">{progress.masteryPercentage}%</span>
                </div>
                <Progress value={progress.masteryPercentage} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {progress.new}
                  </div>
                  <div className="text-xs text-muted-foreground">New</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {progress.learning}
                  </div>
                  <div className="text-xs text-muted-foreground">Learning</div>
                </div>
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {progress.review}
                  </div>
                  <div className="text-xs text-muted-foreground">Review</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {progress.learned}
                  </div>
                  <div className="text-xs text-muted-foreground">Learned</div>
                </div>
              </div>

              {estimatedMinutes > 0 && (
                <div className="text-sm text-muted-foreground text-center pt-2 border-t">
                  Estimated time: {estimatedMinutes} min
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lesson Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lesson.date && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Lesson Date</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(lesson.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              )}

              {lesson.notes && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">Notes</div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded">
                      {lesson.notes}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground pt-2 border-t">
                Created {new Date(lesson.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link href={`/review?lessonId=${lesson.id}`}>
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Classic Review
            </Button>
          </Link>
          <Link href={`/review?lessonId=${lesson.id}&mode=test`}>
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Test Mode
            </Button>
          </Link>
          <Link href={`/lessons/${lesson.id}/learn`}>
            <Button variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              Interactive Lesson
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
            Cards in this lesson ({progress.total})
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
