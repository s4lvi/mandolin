"use client"

import Link from "next/link"
import { useCourses } from "@/hooks/use-courses"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { GraduationCap, ArrowRight } from "lucide-react"
import { courseProgress } from "@/lib/lesson-helpers"

/**
 * Surfaces the user's most relevant in-progress course on the dashboard so
 * they can jump straight back into it.
 */
export function ContinueLearning() {
  const { data: courses } = useCourses()

  if (!courses) return null

  // Enrolled but not yet completed, with the most progress first.
  const inProgress = courses
    .filter((c) => c.enrollment && !c.enrollment.completedAt)
    .sort(
      (a, b) =>
        courseProgress(b.completedLessons, b.totalLessons) -
        courseProgress(a.completedLessons, a.totalLessons)
    )

  const course = inProgress[0]
  if (!course) return null

  const progress = courseProgress(course.completedLessons, course.totalLessons)

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Continue learning</p>
            <p className="font-semibold truncate">{course.title}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground shrink-0">
                {course.completedLessons}/{course.totalLessons}
              </span>
            </div>
          </div>
          <Link href={`/courses/${course.slug}`} className="shrink-0">
            <Button size="sm" className="gap-1">
              Resume
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
