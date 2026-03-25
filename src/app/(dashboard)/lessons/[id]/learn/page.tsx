"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react"
import { AILoading } from "@/components/ui/ai-loading"
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

interface LessonCard {
  id: string
  hanzi: string
  pinyin: string
  english: string
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
  const [allResponses, setAllResponses] = useState<Record<number, any[]>>({})
  const [isComplete, setIsComplete] = useState(false)
  const [lessonCards, setLessonCards] = useState<LessonCard[]>([])

  // Build hanzi → cardId map for SRS submission
  const hanziToCardId = new Map(lessonCards.map(c => [c.hanzi, c.id]))

  // Submit a review to the SRS system when a lesson exercise is answered
  async function submitToSRS(segmentContent: any, isCorrect: boolean) {
    // Try to match the segment to a card by hanzi from various content fields
    const candidates = [
      segmentContent?.hanzi,
      segmentContent?.correctAnswer,
      segmentContent?.sourceText, // For ZH→EN translations
    ].filter(Boolean)

    let cardId: string | undefined
    for (const candidate of candidates) {
      cardId = hanziToCardId.get(candidate)
      if (cardId) break
    }

    if (!cardId) return // Can't match to a card

    // Map: correct = GOOD (2), incorrect = AGAIN (0)
    const quality = isCorrect ? 2 : 0

    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, quality })
      })
    } catch {
      // SRS submission is best-effort; don't block the lesson flow
    }
  }

  // Initialize: generate pages then load saved progress to resume
  useEffect(() => {
    initializeLesson()
  }, [lessonId])

  // Load page when page number changes (after initial setup)
  useEffect(() => {
    if (totalPages > 0) {
      loadPage(currentPageNumber)
    }
  }, [currentPageNumber, totalPages])

  async function initializeLesson() {
    try {
      // Generate pages and fetch lesson cards in parallel
      const [genRes, lessonRes] = await Promise.all([
        fetch(`/api/lessons/${lessonId}/generate-pages`, { method: "POST" }),
        fetch(`/api/lessons/${lessonId}`)
      ])

      if (!genRes.ok) throw new Error("Failed to generate pages")

      const genData = await genRes.json()
      setTotalPages(genData.totalPages)

      // Load lesson cards for SRS matching
      if (lessonRes.ok) {
        const lessonData = await lessonRes.json()
        if (lessonData.lesson?.cards) {
          setLessonCards(lessonData.lesson.cards.map((c: any) => ({
            id: c.id,
            hanzi: c.hanzi,
            pinyin: c.pinyin,
            english: c.english
          })))
        }
      }

      // Load saved progress to resume from where user left off
      const progressRes = await fetch(`/api/lessons/progress?lessonId=${lessonId}`)
      if (progressRes.ok) {
        const progressData = await progressRes.json()
        if (progressData.completedAt) {
          // Already completed, start from page 1 for review
          setCurrentPageNumber(1)
        } else if (progressData.currentPage > 0 && progressData.totalPages > 0) {
          // Resume from saved page
          setCurrentPageNumber(Math.min(progressData.currentPage, genData.totalPages))
        }
        // Restore saved responses
        if (progressData.responses && Array.isArray(progressData.responses)) {
          const restored: Record<number, any[]> = {}
          for (const resp of progressData.responses) {
            const page = resp.page || 1
            if (!restored[page]) restored[page] = []
            restored[page].push(resp)
          }
          setAllResponses(restored)
        }
      }

      setIsGenerating(false)
    } catch (error) {
      console.error("Error initializing lesson:", error)
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

  function addResponse(segmentId: string, isCorrect: boolean, userAnswer: string = "") {
    setAllResponses((prev) => {
      const pageResponses = prev[currentPageNumber] || []
      return {
        ...prev,
        [currentPageNumber]: [
          ...pageResponses,
          { segmentId, correct: isCorrect, userAnswer, page: currentPageNumber }
        ]
      }
    })
  }

  async function handleAnswer(segmentId: string, isCorrect: boolean, userAnswer: string = "") {
    addResponse(segmentId, isCorrect, userAnswer)

    // Find the segment content to match against cards for SRS
    const segment = currentPage?.segments.find(s => s.id === segmentId)
    if (segment) {
      submitToSRS(segment.content, isCorrect)
    }

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
      addResponse(segmentId, result.correct, userAnswer)

      // Submit to SRS — try to match via sourceText for translations
      const segment = currentPage?.segments.find(s => s.id === segmentId)
      if (segment) {
        submitToSRS(segment.content, result.correct)
      }

      await saveProgress(currentPageNumber)

      return result
    } catch (error) {
      console.error("Error evaluating translation:", error)
      toast.error("Failed to evaluate translation")
      return { correct: false }
    }
  }

  async function saveProgress(pageNumber: number) {
    // Flatten all responses across all pages for persistence
    const flatResponses = Object.values(allResponses).flat()
    try {
      await fetch("/api/lessons/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          currentPage: pageNumber,
          totalPages,
          responses: flatResponses
        })
      })
    } catch (error) {
      console.error("Error saving progress:", error)
    }
  }

  function handleNext() {
    if (currentPageNumber < totalPages) {
      const nextPage = currentPageNumber + 1
      setCurrentPageNumber(nextPage)
      // Save progress with the new page number (don't reset responses)
      saveProgress(nextPage)
    } else {
      // Lesson complete
      setIsComplete(true)
      saveProgress(totalPages + 1) // Mark as complete
    }
  }

  function handlePrevious() {
    if (currentPageNumber > 1) {
      setCurrentPageNumber((prev) => prev - 1)
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
