"use client"

import { use, useEffect, useRef, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Loader2, CheckCircle, Trophy } from "lucide-react"
import { AILoading } from "@/components/ui/ai-loading"
import { TextSegment } from "@/components/lessons/interactive/text-segment"
import { FlashcardSegment } from "@/components/lessons/interactive/flashcard-segment"
import { MultipleChoiceSegment } from "@/components/lessons/interactive/multiple-choice-segment"
import { FillInSegment } from "@/components/lessons/interactive/fill-in-segment"
import { TranslationSegment } from "@/components/lessons/interactive/translation-segment"
import { FeedbackSegment } from "@/components/lessons/interactive/feedback-segment"
import { toast } from "sonner"

// Segment content is stored as JSON; fields depend on the segment type.
interface SegmentContent {
  title?: string
  text: string
  hanzi: string
  pinyin: string
  english: string
  notes?: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  sentence: string
  correctAnswer: string
  translation: string
  hint?: string
  sourceText: string
  acceptableTranslations: string[]
  userAnswer: string
  encouragement?: string
}

interface Segment {
  id: string
  type: string
  orderIndex: number
  content: SegmentContent
}

interface Page {
  id: string
  pageNumber: number
  segments: Segment[]
}

interface LessonCard {
  id: string
  hanzi: string
  pinyin: string
  english: string
}

interface LessonResponse {
  segmentId: string
  correct: boolean
  userAnswer: string
  page: number
}

type ResponsesByPage = Record<number, LessonResponse[]>

// totalPages and the page to show are held together so resuming a lesson
// triggers exactly one page load (no intermediate render with page 1).
interface PagePosition {
  totalPages: number
  pageNumber: number
}

function InteractiveLessonContent({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const lessonId = resolvedParams.id
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // Course context (present when this lesson was launched from a course)
  const courseSlug = searchParams.get("course")
  const courseOrderParam = searchParams.get("order")
  const courseOrder = courseOrderParam ? parseInt(courseOrderParam, 10) : null

  const [courseResult, setCourseResult] = useState<{
    nextLessonOrder: number | null
    courseCompleted: boolean
  } | null>(null)
  const [advancing, setAdvancing] = useState(false)

  const [isGenerating, setIsGenerating] = useState(true)
  const [position, setPosition] = useState<PagePosition>({ totalPages: 0, pageNumber: 1 })
  const { totalPages, pageNumber: currentPageNumber } = position
  const [currentPage, setCurrentPage] = useState<Page | null>(null)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  // Responses are kept in a ref (nothing renders from them) so a save issued
  // right after addResponse sees the new answer instead of a stale closure.
  const responsesRef = useRef<ResponsesByPage>({})
  const [isComplete, setIsComplete] = useState(false)
  const [lessonCards, setLessonCards] = useState<LessonCard[]>([])

  // Build hanzi → cardId map for SRS submission
  const hanziToCardId = new Map(lessonCards.map(c => [c.hanzi, c.id]))

  // Anything that changes SRS state, progress, or course status should refresh
  // the cached lists/counters shown elsewhere in the app.
  function invalidateStudyQueries(options: { course?: boolean } = {}) {
    queryClient.invalidateQueries({ queryKey: ["cards"] })
    queryClient.invalidateQueries({ queryKey: ["due-count"] })
    queryClient.invalidateQueries({ queryKey: ["user-stats"] })
    queryClient.invalidateQueries({ queryKey: ["lessons"] })
    queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] })
    if (options.course) {
      queryClient.invalidateQueries({ queryKey: ["courses"] })
      queryClient.invalidateQueries({ queryKey: ["course"] })
    }
  }

  // Submit a review to the SRS system when a lesson exercise is answered
  async function submitToSRS(segmentContent: Partial<SegmentContent> | null | undefined, isCorrect: boolean) {
    // Try to match the segment to a card by hanzi from various content fields
    const candidates = [
      segmentContent?.hanzi,
      segmentContent?.correctAnswer,
      segmentContent?.sourceText, // For ZH→EN translations
    ].filter((c): c is string => Boolean(c))

    let cardId: string | undefined
    for (const candidate of candidates) {
      cardId = hanziToCardId.get(candidate)
      if (cardId) break
    }

    if (!cardId) return // Can't match to a card

    // Map: correct = GOOD (2), incorrect = AGAIN (0)
    const quality = isCorrect ? 2 : 0

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, quality })
      })
      if (res.ok) invalidateStudyQueries()
    } catch {
      // SRS submission is best-effort; don't block the lesson flow
    }
  }

  // Initialize: generate pages then load saved progress to resume.
  // Cancelled (fetches aborted, state updates skipped) when the lesson changes
  // or the page unmounts, so a slow response can't clobber the new lesson.
  useEffect(() => {
    const controller = new AbortController()
    initializeLesson(controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  // Load page when the position changes (after initial setup)
  useEffect(() => {
    if (totalPages === 0) return
    const controller = new AbortController()
    loadPage(currentPageNumber, controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageNumber, totalPages, lessonId])

  async function initializeLesson(signal: AbortSignal, retryCount = 0) {
    // Reset per-lesson state (the same component is reused when advancing
    // to the next course lesson, which only changes the route params)
    if (retryCount === 0) {
      setIsComplete(false)
      setCourseResult(null)
      setIsGenerating(true)
      setCurrentPage(null)
      setPosition({ totalPages: 0, pageNumber: 1 })
      responsesRef.current = {}
    }
    try {
      // Generate pages and fetch lesson cards in parallel
      const [genRes, lessonRes] = await Promise.all([
        fetch(`/api/lessons/${lessonId}/generate-pages`, { method: "POST", signal }),
        fetch(`/api/lessons/${lessonId}`, { signal })
      ])

      if (!genRes.ok) {
        // Retry once — AI responses occasionally fail on first attempt
        if (retryCount < 1) {
          console.warn("Page generation failed, retrying...")
          return initializeLesson(signal, retryCount + 1)
        }
        throw new Error("Failed to generate pages")
      }

      const genData = await genRes.json()
      const generatedTotal: number = genData.totalPages

      // Load lesson cards for SRS matching
      let cards: LessonCard[] = []
      if (lessonRes.ok) {
        const lessonData = await lessonRes.json()
        if (lessonData.lesson?.cards) {
          cards = lessonData.lesson.cards.map((c: LessonCard) => ({
            id: c.id,
            hanzi: c.hanzi,
            pinyin: c.pinyin,
            english: c.english
          }))
        }
      }

      // Load saved progress to resume from where user left off
      let resumePage = 1
      const restored: ResponsesByPage = {}
      const progressRes = await fetch(`/api/lessons/progress?lessonId=${lessonId}`, { signal })
      if (progressRes.ok) {
        const progressData = await progressRes.json()
        if (
          !progressData.completedAt &&
          progressData.currentPage > 0 &&
          progressData.totalPages > 0
        ) {
          // Resume from saved page (completed lessons restart at page 1 for review)
          resumePage = Math.min(progressData.currentPage, generatedTotal)
        }
        // Restore saved responses
        if (progressData.responses && Array.isArray(progressData.responses)) {
          for (const resp of progressData.responses as LessonResponse[]) {
            const page = resp.page || 1
            if (!restored[page]) restored[page] = []
            restored[page].push(resp)
          }
        }
      }

      if (signal.aborted) return

      // Commit everything at once so the page-load effect fires a single time
      setLessonCards(cards)
      responsesRef.current = restored
      setPosition({ totalPages: generatedTotal, pageNumber: resumePage })
      setIsGenerating(false)
    } catch (error) {
      if (signal.aborted) return
      console.error("Error initializing lesson:", error)
      toast.error("Failed to generate lesson pages")
      router.push(`/lessons/${lessonId}`)
    }
  }

  async function loadPage(pageNumber: number, signal: AbortSignal) {
    setIsLoadingPage(true)
    try {
      const res = await fetch(
        `/api/lessons/pages/${pageNumber}?lessonId=${lessonId}`,
        { signal }
      )

      if (!res.ok) throw new Error("Failed to load page")

      const data = await res.json()
      if (signal.aborted) return
      setCurrentPage(data.page)
    } catch (error) {
      if (signal.aborted) return
      console.error("Error loading page:", error)
      toast.error("Failed to load page")
    } finally {
      if (!signal.aborted) setIsLoadingPage(false)
    }
  }

  // Append a response and return the resulting map so callers can persist it
  // immediately without waiting for a re-render.
  function addResponse(
    segmentId: string,
    isCorrect: boolean,
    userAnswer: string = ""
  ): ResponsesByPage {
    const prev = responsesRef.current
    const pageResponses = prev[currentPageNumber] || []
    const next: ResponsesByPage = {
      ...prev,
      [currentPageNumber]: [
        ...pageResponses,
        { segmentId, correct: isCorrect, userAnswer, page: currentPageNumber }
      ]
    }
    responsesRef.current = next
    return next
  }

  async function handleAnswer(segmentId: string, isCorrect: boolean, userAnswer: string = "") {
    const responses = addResponse(segmentId, isCorrect, userAnswer)

    // Find the segment content to match against cards for SRS
    const segment = currentPage?.segments.find(s => s.id === segmentId)
    if (segment) {
      submitToSRS(segment.content, isCorrect)
    }

    await saveProgress(currentPageNumber, responses)
  }

  async function handleTranslationAnswer(segmentId: string, userAnswer: string) {
    try {
      const res = await fetch("/api/lessons/pages/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentId,
          segmentType: currentPage?.segments.find((s) => s.id === segmentId)?.type,
          userAnswer
        })
      })

      if (!res.ok) throw new Error("Failed to evaluate answer")

      const result = await res.json()
      const responses = addResponse(segmentId, result.correct, userAnswer)

      // Submit to SRS — try to match via sourceText for translations
      const segment = currentPage?.segments.find(s => s.id === segmentId)
      if (segment) {
        submitToSRS(segment.content, result.correct)
      }

      await saveProgress(currentPageNumber, responses)

      return result
    } catch (error) {
      console.error("Error evaluating translation:", error)
      toast.error("Failed to evaluate translation")
      return { correct: false }
    }
  }

  async function saveProgress(
    pageNumber: number,
    responses: ResponsesByPage = responsesRef.current
  ) {
    // Flatten all responses across all pages for persistence
    const flatResponses = Object.values(responses).flat()
    try {
      const res = await fetch("/api/lessons/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          currentPage: pageNumber,
          totalPages,
          responses: flatResponses
        })
      })
      if (res.ok) invalidateStudyQueries()
    } catch (error) {
      console.error("Error saving progress:", error)
    }
  }

  async function handleNext() {
    if (currentPageNumber < totalPages) {
      const nextPage = currentPageNumber + 1
      setPosition((prev) => ({ ...prev, pageNumber: nextPage }))
      // Save progress with the new page number (don't reset responses)
      saveProgress(nextPage)
    } else {
      // Lesson complete
      setIsComplete(true)
      await saveProgress(totalPages + 1) // Mark as complete

      // If this lesson is part of a course, record course completion and
      // unlock the next lesson.
      if (courseSlug && courseOrder) {
        try {
          const res = await fetch(
            `/api/courses/${courseSlug}/lessons/${courseOrder}/complete`,
            { method: "POST" }
          )
          if (res.ok) {
            const data = await res.json()
            setCourseResult({
              nextLessonOrder: data.nextLessonOrder ?? null,
              courseCompleted: !!data.courseCompleted
            })
            invalidateStudyQueries({ course: true })
          }
        } catch {
          // Non-blocking: the completion screen still shows
        }
      }
    }
  }

  async function handleNextLesson() {
    if (!courseSlug || !courseResult?.nextLessonOrder) return
    setAdvancing(true)
    try {
      const order = courseResult.nextLessonOrder
      const res = await fetch(`/api/courses/${courseSlug}/lessons/${order}/start`, {
        method: "POST"
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to start next lesson")
      router.push(`/lessons/${data.lessonId}/learn?course=${courseSlug}&order=${order}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start next lesson")
      setAdvancing(false)
    }
  }

  function handlePrevious() {
    if (currentPageNumber > 1) {
      setPosition((prev) => ({ ...prev, pageNumber: prev.pageNumber - 1 }))
      // Don't reset responses — they're preserved per page
    }
  }

  if (isGenerating) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Generating Your Interactive Lesson</h2>
          <AILoading
            status="generating"
            statusLabels={{ generating: "Creating exercises and content" }}
          />
        </div>
      </div>
    )
  }

  if (isComplete) {
    const inCourse = !!courseSlug
    const courseDone = courseResult?.courseCompleted
    const hasNext = !!courseResult?.nextLessonOrder

    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="text-center space-y-6">
          {courseDone ? (
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
          ) : (
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
          )}
          <h2 className="text-3xl font-bold">
            {courseDone ? "Course Complete! 🎉" : "Lesson Complete!"}
          </h2>
          <p className="text-muted-foreground text-lg">
            {courseDone
              ? "You've finished every lesson in this course. Amazing work!"
              : inCourse && hasNext
                ? "Nice work — the next lesson is now unlocked."
                : "Great job completing this interactive lesson."}
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            {inCourse && hasNext && !courseDone && (
              <Button onClick={handleNextLesson} disabled={advancing}>
                {advancing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Next Lesson
              </Button>
            )}
            {inCourse ? (
              <Button
                variant={hasNext && !courseDone ? "outline" : "default"}
                onClick={() => router.push(`/courses/${courseSlug}`)}
              >
                Back to Course
              </Button>
            ) : (
              <Button onClick={() => router.push(`/lessons/${lessonId}`)}>
                Back to Lesson
              </Button>
            )}
            {!inCourse && (
              <Button variant="outline" onClick={() => router.push("/lessons")}>
                View All Lessons
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (isLoadingPage || !currentPage) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </div>
    )
  }

  const progress = (currentPageNumber / totalPages) * 100

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push(`/lessons/${lessonId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Exit Lesson
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {currentPageNumber} of {totalPages}
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={progress} className="h-2" />

      {/* Segments */}
      <div className="space-y-6">
        {currentPage.segments.map((segment) => {
          switch (segment.type) {
            case "TEXT":
              return (
                <TextSegment
                  key={segment.id}
                  title={segment.content.title}
                  text={segment.content.text}
                />
              )

            case "FLASHCARD":
              return (
                <FlashcardSegment
                  key={segment.id}
                  hanzi={segment.content.hanzi}
                  pinyin={segment.content.pinyin}
                  english={segment.content.english}
                  notes={segment.content.notes}
                />
              )

            case "MULTIPLE_CHOICE":
              return (
                <MultipleChoiceSegment
                  key={segment.id}
                  question={segment.content.question}
                  options={segment.content.options}
                  correctIndex={segment.content.correctIndex}
                  explanation={segment.content.explanation}
                  onAnswer={(isCorrect) => handleAnswer(segment.id, isCorrect)}
                />
              )

            case "FILL_IN":
              return (
                <FillInSegment
                  key={segment.id}
                  sentence={segment.content.sentence}
                  correctAnswer={segment.content.correctAnswer}
                  pinyin={segment.content.pinyin}
                  translation={segment.content.translation}
                  hint={segment.content.hint}
                  onAnswer={(isCorrect, userAnswer) =>
                    handleAnswer(segment.id, isCorrect, userAnswer)
                  }
                />
              )

            case "TRANSLATION_EN_ZH":
            case "TRANSLATION_ZH_EN":
              return (
                <TranslationSegment
                  key={segment.id}
                  type={segment.type as "TRANSLATION_EN_ZH" | "TRANSLATION_ZH_EN"}
                  sourceText={segment.content.sourceText}
                  acceptableTranslations={segment.content.acceptableTranslations}
                  hint={segment.content.hint}
                  onAnswer={(userAnswer) =>
                    handleTranslationAnswer(segment.id, userAnswer)
                  }
                />
              )

            case "FEEDBACK":
              return (
                <FeedbackSegment
                  key={segment.id}
                  userAnswer={segment.content.userAnswer}
                  correctAnswer={segment.content.correctAnswer}
                  explanation={segment.content.explanation}
                  encouragement={segment.content.encouragement}
                />
              )

            default:
              return null
          }
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentPageNumber === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button onClick={handleNext}>
          {currentPageNumber < totalPages ? (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            "Complete Lesson"
          )}
        </Button>
      </div>
    </div>
  )
}

export default function InteractiveLessonPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </div>
      }
    >
      <InteractiveLessonContent params={params} />
    </Suspense>
  )
}
