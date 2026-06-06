"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useCourseDetail, useEnrollCourse, useStartCourseLesson, useSetCoursePublished, type CourseLessonView } from "@/hooks/use-courses"
import { Card, CardContent } from "@/components/ui/card"
import { courseProgress } from "@/lib/lesson-helpers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Lock, CheckCircle, Play, Loader2, ArrowLeft, BookOpen, Globe, EyeOff } from "lucide-react"
import { toast } from "sonner"

export default function CourseDetailPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const resolvedParams = use(params)
  const slug = resolvedParams.slug
  const router = useRouter()

  const { data, isLoading } = useCourseDetail(slug)
  const enrollMutation = useEnrollCourse()
  const startMutation = useStartCourseLesson()
  const publishMutation = useSetCoursePublished()

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const { course, enrollment, lessons } = data
  const completedCount = lessons.filter((l) => l.status === "COMPLETED").length
  const progress = courseProgress(completedCount, lessons.length)

  const handleTogglePublished = async () => {
    const publish = !course.isPublished
    try {
      await publishMutation.mutateAsync({ slug, publish })
      toast.success(publish ? "Course published — others can now find it" : "Course is now private")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update course")
    }
  }

  const handleEnroll = async () => {
    try {
      await enrollMutation.mutateAsync(slug)
      toast.success("Enrolled! Start your first lesson.")
    } catch {
      toast.error("Failed to enroll")
    }
  }

  const handleStartLesson = async (order: number) => {
    try {
      const result = await startMutation.mutateAsync({ slug, order })
      if (result.duplicates > 0) {
        toast.success(`${result.created} cards added (${result.duplicates} already in your deck)`)
      }
      router.push(`/lessons/${result.lessonId}/learn?course=${slug}&order=${order}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start lesson")
    }
  }

  const handleContinueLesson = (lessonId: string, order: number) => {
    router.push(`/lessons/${lessonId}/learn?course=${slug}&order=${order}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/courses")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        All Courses
      </Button>

      {/* Course header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{course.title}</h1>
        {course.description && (
          <p className="text-muted-foreground mt-1">{course.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>{course.totalLessons} lessons</span>
          {course.isBuiltIn && <Badge variant="secondary">Official</Badge>}
          {course.isMine && (
            <Badge variant={course.isPublished ? "default" : "outline"} className="gap-1">
              {course.isPublished ? <Globe className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {course.isPublished ? "Public" : "Private"}
            </Badge>
          )}
        </div>

        {/* Owner publish controls */}
        {course.isMine && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {course.isPublished ? "This course is public" : "This course is private"}
              </p>
              <p className="text-xs text-muted-foreground">
                {course.isPublished
                  ? "Anyone can find and enroll in it."
                  : "Only you can see it. Publish it to share with other learners."}
              </p>
            </div>
            <Button
              variant={course.isPublished ? "outline" : "default"}
              size="sm"
              onClick={handleTogglePublished}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : course.isPublished ? (
                "Make Private"
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Publish
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Progress */}
      {enrollment && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{completedCount} / {lessons.length} lessons completed</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Enroll button if not enrolled */}
      {!enrollment && (
        <Button
          className="w-full h-12"
          onClick={handleEnroll}
          disabled={enrollMutation.isPending}
        >
          {enrollMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Start Course
        </Button>
      )}

      {/* Lesson list */}
      <div className="space-y-2">
        {lessons.map((lesson: CourseLessonView) => {
          const isLocked = lesson.status === "LOCKED"
          const isCompleted = lesson.status === "COMPLETED"
          const isInProgress = lesson.status === "IN_PROGRESS"
          const isUnlocked = lesson.status === "UNLOCKED"

          return (
            <Card
              key={lesson.id}
              className={`transition-all ${
                isLocked ? "opacity-50" : "hover:shadow-md cursor-pointer"
              }`}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* Status icon */}
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                  isCompleted ? "bg-green-100 dark:bg-green-950/30 text-green-600" :
                  isInProgress ? "bg-primary/10 text-primary" :
                  isUnlocked ? "bg-blue-100 dark:bg-blue-950/30 text-blue-600" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-bold">{lesson.order}</span>
                  )}
                </div>

                {/* Lesson info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{lesson.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {lesson.cardCount} cards
                    {lesson.description && ` — ${lesson.description}`}
                  </p>
                </div>

                {/* Action */}
                {!isLocked && (
                  <Button
                    size="sm"
                    variant={isCompleted ? "outline" : "default"}
                    disabled={startMutation.isPending}
                    onClick={() => {
                      if ((isInProgress || isCompleted) && lesson.lessonId) {
                        handleContinueLesson(lesson.lessonId, lesson.order)
                      } else {
                        handleStartLesson(lesson.order)
                      }
                    }}
                  >
                    {startMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isCompleted ? "Review" : isInProgress ? "Continue" : "Start"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
