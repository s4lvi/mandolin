"use client"

import Link from "next/link"
import { useCourses } from "@/hooks/use-courses"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { BookOpen, GraduationCap, CheckCircle } from "lucide-react"
import { CardListSkeleton } from "@/components/ui/skeleton"
import { LearnTabs } from "@/components/layout/learn-tabs"
import { courseProgress } from "@/lib/lesson-helpers"
import type { CourseSummary } from "@/hooks/use-courses"

export default function CoursesPage() {
  const { data: courses, isLoading } = useCourses()

  return (
    <div className="space-y-6">
      <LearnTabs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">
            Structured learning tracks to build your Mandarin foundation
          </p>
        </div>
        <Link href="/courses/create">
          <Button variant="outline" size="sm">
            <GraduationCap className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <CardListSkeleton count={3} />
      ) : !courses || courses.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No courses available yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course: CourseSummary) => {
            const progress = courseProgress(course.completedLessons, course.totalLessons)
            const isEnrolled = !!course.enrollment
            const isCompleted = !!course.enrollment?.completedAt

            return (
              <Link key={course.id} href={`/courses/${course.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <div className="flex gap-1">
                        {isCompleted && (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Done
                          </Badge>
                        )}
                        {course.isBuiltIn && (
                          <Badge variant="secondary">Official</Badge>
                        )}
                        {course.isMine && !course.isBuiltIn && (
                          <Badge variant={course.isPublished ? "default" : "outline"}>
                            {course.isPublished ? "Public" : "Private"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.totalLessons} lessons</span>
                    </div>

                    {isEnrolled && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{course.completedLessons} / {course.totalLessons} completed</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    <Button
                      variant={isEnrolled ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                    >
                      {isCompleted ? "Review" : isEnrolled ? "Continue" : "Start Course"}
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
