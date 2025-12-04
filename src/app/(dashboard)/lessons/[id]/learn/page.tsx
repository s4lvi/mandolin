"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react"
import { TextSegment } from "@/components/lessons/interactive/text-segment"
import { FlashcardSegment } from "@/components/lessons/interactive/flashcard-segment"
import { MultipleChoiceSegment } from "@/components/lessons/interactive/multiple-choice-segment"
import { FillInSegment } from "@/components/lessons/interactive/fill-in-segment"
import { TranslationSegment } from "@/components/lessons/interactive/translation-segment"
import { FeedbackSegment } from "@/components/lessons/interactive/feedback-segment"
import { toast } from "sonner"

interface Segment {
  id: string
  type: string
  orderIndex: number
  content: any
}

interface Page {
  id: string
  pageNumber: number
  segments: Segment[]
}

export default function InteractiveLessonPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const lessonId = resolvedParams.id
  const router = useRouter()

  const [isGenerating, setIsGenerating] = useState(true)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPageNumber, setCurrentPageNumber] = useState(1)
  const [currentPage, setCurrentPage] = useState<Page | null>(null)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [responses, setResponses] = useState<any[]>([])
  const [isComplete, setIsComplete] = useState(false)

  // Generate pages on mount
  useEffect(() => {
    generatePages()
  }, [lessonId])

  // Load page when page number changes
  useEffect(() => {
    if (totalPages > 0) {
      loadPage(currentPageNumber)
    }
  }, [currentPageNumber, totalPages])

  async function generatePages() {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/generate-pages`, {
        method: "POST"
      })

      if (!res.ok) throw new Error("Failed to generate pages")

      const data = await res.json()
      setTotalPages(data.totalPages)
      setIsGenerating(false)
    } catch (error) {
      console.error("Error generating pages:", error)
      toast.error("Failed to generate lesson pages")
      router.push(`/lessons/${lessonId}`)
    }
  }

  async function loadPage(pageNumber: number) {
    setIsLoadingPage(true)
    try {
      const res = await fetch(
        `/api/lessons/pages/${pageNumber}?lessonId=${lessonId}`
      )

      if (!res.ok) throw new Error("Failed to load page")

      const data = await res.json()
      setCurrentPage(data.page)
    } catch (error) {
      console.error("Error loading page:", error)
      toast.error("Failed to load page")
    } finally {
      setIsLoadingPage(false)
    }
  }

  async function handleAnswer(segmentId: string, isCorrect: boolean, userAnswer: string = "") {
    setResponses((prev) => [
      ...prev,
      {
        segmentId,
        correct: isCorrect,
        userAnswer
      }
    ])

    // Save progress
    await saveProgress(currentPageNumber)
  }

  async function handleTranslationAnswer(
    segmentId: string,
    userAnswer: string,
    sourceText: string,
    acceptableTranslations: string[]
  ) {
    try {
      const res = await fetch("/api/lessons/pages/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentId,
          segmentType: currentPage?.segments.find((s) => s.id === segmentId)?.type,
          userAnswer,
          sourceText,
          acceptableTranslations
        })
      })

      if (!res.ok) throw new Error("Failed to evaluate answer")

      const result = await res.json()

      // Record response
      setResponses((prev) => [
        ...prev,
        {
          segmentId,
          correct: result.correct,
          userAnswer
        }
      ])

      // Save progress
      await saveProgress(currentPageNumber)

      return result
    } catch (error) {
      console.error("Error evaluating translation:", error)
      toast.error("Failed to evaluate translation")
      return { correct: false }
    }
  }

  async function saveProgress(pageNumber: number) {
    try {
      await fetch("/api/lessons/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          currentPage: pageNumber,
          totalPages,
          responses
        })
      })
    } catch (error) {
      console.error("Error saving progress:", error)
    }
  }

  function handleNext() {
    if (currentPageNumber < totalPages) {
      setCurrentPageNumber((prev) => prev + 1)
      setResponses([])
    } else {
      // Lesson complete
      setIsComplete(true)
      saveProgress(totalPages + 1) // Mark as complete
    }
  }

  function handlePrevious() {
    if (currentPageNumber > 1) {
      setCurrentPageNumber((prev) => prev - 1)
      setResponses([])
    }
  }

  if (isGenerating) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h2 className="text-2xl font-bold">Generating Your Interactive Lesson</h2>
          <p className="text-muted-foreground">
            Creating 10 pages of educational content with AI...
          </p>
          <Progress value={33} className="w-full max-w-md mx-auto" />
        </div>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="text-center space-y-6">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
          <h2 className="text-3xl font-bold">Lesson Complete!</h2>
          <p className="text-muted-foreground text-lg">
            Great job completing this interactive lesson.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button onClick={() => router.push(`/lessons/${lessonId}`)}>
              Back to Lesson
            </Button>
            <Button variant="outline" onClick={() => router.push("/lessons")}>
              View All Lessons
            </Button>
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
                    handleTranslationAnswer(
                      segment.id,
                      userAnswer,
                      segment.content.sourceText,
                      segment.content.acceptableTranslations
                    )
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
