"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { ErrorBoundaryWithRouter as ErrorBoundary } from "@/components/error-boundary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, ArrowRight, Play, Plus, Upload } from "lucide-react"
import { CreateLessonModal } from "@/components/lessons/create-lesson-modal"
import type { Lesson } from "@/types"

interface LessonWithProgress extends Lesson {
  progress?: {
    new: number
    learning: number
    review: number
    learned: number
    total: number
    masteryPercentage: number
  }
}

async function fetchLessons(): Promise<LessonWithProgress[]> {
  const res = await fetch("/api/lessons")
  if (!res.ok) {
    throw new Error("Failed to fetch lessons")
  }
  const data = await res.json()
  return data.lessons
}

export default function LessonsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons
  })

  return (
    <ErrorBoundary>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Lessons</h1>
          <p className="text-muted-foreground">
            Organize your cards into structured learning paths
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

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading lessons...</p>
        </div>
      ) : lessons?.length === 0 ? (
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lessons?.map((lesson) => {
            const progress = lesson.progress
            const cardCount = lesson._count?.cards || 0

            return (
              <Link key={lesson.id} href={`/lessons/${lesson.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg">
                        Lesson {lesson.number}
                      </CardTitle>
                      <Badge variant="secondary">
                        {cardCount} {cardCount === 1 ? 'card' : 'cards'}
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

                    {progress && cardCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress.masteryPercentage}%</span>
                        </div>
                        <Progress value={progress.masteryPercentage} className="h-2" />
                        <div className="flex gap-2 text-xs">
                          <span className="text-blue-600 dark:text-blue-400">
                            {progress.new} new
                          </span>
                          <span className="text-yellow-600 dark:text-yellow-400">
                            {progress.learning} learning
                          </span>
                          <span className="text-green-600 dark:text-green-400">
                            {progress.learned} learned
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.preventDefault()
                          window.location.href = `/review?lessonId=${lesson.id}&mode=narrative`
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Learn
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          window.location.href = `/lessons/${lesson.id}`
                        }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <CreateLessonModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
    </ErrorBoundary>
  )
}
