"use client"

import Link from "next/link"
import { useCourses } from "@/hooks/use-courses"
import { useLessons } from "@/hooks/use-lessons"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { GraduationCap, BookOpen, ArrowRight } from "lucide-react"
import { courseProgress, formatLessonTitle } from "@/lib/lesson-helpers"

interface ContinueItem {
  key: string
  kind: "course" | "lesson"
  title: string
  href: string
  progress: number
  progressLabel: string
  /** Best available recency signal, used for ordering (newest first). */
  updatedAt: number
}

const MAX_ITEMS = 2

/**
 * Surfaces the user's in-progress courses and interactive lessons on the
 * dashboard so they can jump straight back in.
 */
export function ContinueLearning() {
  const { data: courses } = useCourses()
  const { data: lessons } = useLessons()

  const items: ContinueItem[] = []

  for (const c of courses ?? []) {
    if (!c.enrollment || c.enrollment.completedAt) continue
    items.push({
      key: `course-${c.id}`,
      kind: "course",
      title: c.title,
      href: `/courses/${c.slug}`,
      progress: courseProgress(c.completedLessons, c.totalLessons),
      progressLabel: `${c.completedLessons}/${c.totalLessons} lessons`,
      // The courses list does not expose enrollment.updatedAt, so fall back to enrolledAt.
      updatedAt: Date.parse(c.enrollment.enrolledAt) || 0
    })
  }

  for (const l of lessons ?? []) {
    const p = l.lessonProgress
    if (!p || p.isComplete || p.totalPages <= 0) continue
    items.push({
      key: `lesson-${l.id}`,
      kind: "lesson",
      title: formatLessonTitle(l.number, l.title),
      href: `/lessons/${l.id}/learn`,
      progress: Math.round((p.currentPage / p.totalPages) * 100),
      progressLabel: `page ${p.currentPage}/${p.totalPages}`,
      // The lessons list does not expose progress.updatedAt; use the lesson date as a proxy.
      updatedAt: l.date ? Date.parse(String(l.date)) || 0 : 0
    })
  }

  if (items.length === 0) return null

  const top = items.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_ITEMS)

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-1">
        Continue learning
      </p>
      {top.map((item) => {
        const Icon = item.kind === "course" ? GraduationCap : BookOpen
        return (
          <Card key={item.key} className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {item.kind === "course" ? "Course" : "Lesson"}
                  </p>
                  <p className="font-semibold truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Progress value={item.progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground shrink-0">
                      {item.progressLabel}
                    </span>
                  </div>
                </div>
                <Link href={item.href} className="shrink-0">
                  <Button size="sm" className="gap-1">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
