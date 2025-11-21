"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { ErrorBoundary } from "@/components/error-boundary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, ArrowRight } from "lucide-react"
import type { Lesson } from "@/types"

async function fetchLessons(): Promise<Lesson[]> {
  const res = await fetch("/api/lessons")
  if (!res.ok) {
    throw new Error("Failed to fetch lessons")
  }
  const data = await res.json()
  return data.lessons
}

export default function LessonsPage() {
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons
  })

  return (
    <ErrorBoundary>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lessons</h1>
          <p className="text-muted-foreground">
            View your lessons and their associated cards
          </p>
        </div>
        <Link href="/upload">
          <Button>Upload Notes</Button>
        </Link>
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
          {lessons?.map((lesson) => (
            <Card key={lesson.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    Lesson {lesson.number}
                  </CardTitle>
                  <Badge variant="secondary">
                    {lesson._count?.cards || 0} cards
                  </Badge>
                </div>
                {lesson.title && (
                  <p className="text-sm text-muted-foreground">{lesson.title}</p>
                )}
              </CardHeader>
              <CardContent>
                {lesson.date && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {new Date(lesson.date).toLocaleDateString()}
                  </p>
                )}
                <Link href={`/deck?lessonId=${lesson.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Cards
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </ErrorBoundary>
  )
}
