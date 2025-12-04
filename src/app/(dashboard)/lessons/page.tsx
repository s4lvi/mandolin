"use client"

import { useState } from "react"
import Link from "next/link"
import { useLessons } from "@/hooks/use-lessons"
import { ErrorBoundaryWithRouter as ErrorBoundary } from "@/components/error-boundary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, ArrowRight, Play, Plus, Upload, CheckCircle } from "lucide-react"
import { CreateLessonModal } from "@/components/lessons/create-lesson-modal"

export default function LessonsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: lessons, isLoading } = useLessons()

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
      ) : !lessons || !Array.isArray(lessons) || lessons.length === 0 ? (
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
          {lessons.map((lesson) => {
            const cardCount = lesson._count?.cards || 0
            const lessonProgress = lesson.lessonProgress
            const isComplete = lessonProgress?.isComplete
            const progressPercent = lessonProgress
              ? Math.round((lessonProgress.currentPage / lessonProgress.totalPages) * 100)
              : 0

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
                        {isComplete && (
                          <Progress value={100} className="h-2" />
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.preventDefault()
                          window.location.href = `/lessons/${lesson.id}/learn`
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        {isComplete ? "Review" : lessonProgress ? "Continue" : "Start"}
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
