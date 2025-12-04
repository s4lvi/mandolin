"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import {
  useReviewCards,
  useSubmitReview,
  useGenerateSentence
} from "@/hooks/use-review"
import { usePrefetchTestQuestions } from "@/hooks/use-test-questions"
import { useLessons } from "@/hooks/use-lessons"
import { Flashcard, Quality } from "@/components/review/flashcard"
import { TestCard } from "@/components/review/test-card"
import { NarrativeMode } from "@/components/review/narrative-mode"
import { SessionComplete } from "@/components/review/session-complete"
import { ReviewSettings } from "@/components/review/review-settings"
import { SessionHeader } from "@/components/review/session-header"
import { NoCardsView } from "@/components/review/no-cards-view"
import { ErrorBoundaryWithRouter as ErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen } from "lucide-react"
import { toast } from "sonner"
import { sortCardsForNarrativeMode } from "@/lib/lesson-helpers"
import type { Card as CardType, FaceMode, ExampleSentence, ReviewMode, TestDirection } from "@/types"

interface SessionResults {
  again: number
  hard: number
  good: number
  easy: number
  totalXp: number
}

export default function ReviewPage() {
  const searchParams = useSearchParams()

  // Read URL parameters for direct lesson access
  const urlLessonId = searchParams.get("lessonId")
  const urlMode = searchParams.get("mode") as ReviewMode | null

  const [isStarted, setIsStarted] = useState(false)
  const [faceMode, setFaceMode] = useState<FaceMode>("hanzi")
  const [reviewMode, setReviewMode] = useState<ReviewMode>(urlMode || "classic")
  const [testDirection, setTestDirection] = useState<TestDirection>("HANZI_TO_MEANING")
  const [cardLimit, setCardLimit] = useState("20")
  const [allCards, setAllCards] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedLesson, setSelectedLesson] = useState<string>(urlLessonId || "all")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<SessionResults>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    totalXp: 0
  })
  const [examples, setExamples] = useState<Record<string, ExampleSentence>>({})
  const [actualFaceMode, setActualFaceMode] = useState<FaceMode>("hanzi")
  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [sessionCards, setSessionCards] = useState<CardType[]>([])
  const isProcessing = useRef(false)

  const {
    data: reviewData,
    isLoading,
    refetch
  } = useReviewCards({
    limit: parseInt(cardLimit),
    allCards,
    tagIds: selectedTags,
    types: selectedTypes,
    lessonId: selectedLesson !== "all" ? selectedLesson : undefined
  })

  const availableTags = reviewData?.availableTags || []
  const cards = reviewData?.cards
  const userStats = reviewData?.userStats

  const submitReviewMutation = useSubmitReview()
  const generateSentenceMutation = useGenerateSentence()
  const prefetchMutation = usePrefetchTestQuestions()
  const { data: lessons } = useLessons()

  // Find selected lesson for display
  const currentLesson = selectedLesson !== "all" && lessons && Array.isArray(lessons)
    ? lessons.find(l => l.id === selectedLesson)
    : null

  // Shuffle cards from session snapshot (frozen at session start)
  // For narrative mode, use SRS sorting instead of random shuffle
  const shuffledCards = useMemo(() => {
    if (sessionCards.length === 0) return []

    if (reviewMode === "narrative") {
      // Use SRS-based sorting for narrative mode
      return sortCardsForNarrativeMode(sessionCards)
    }

    // Random shuffle for other modes
    return [...sessionCards].sort(() => Math.random() - 0.5)
  }, [sessionCards, reviewMode])

  const currentCard = shuffledCards[currentIndex]
  const progress = shuffledCards.length
    ? ((currentIndex) / shuffledCards.length) * 100
    : 0
  const isComplete = currentIndex >= shuffledCards.length && shuffledCards.length > 0

  // Set random face mode for each card if mode is random
  useEffect(() => {
    if (faceMode === "random" && currentCard) {
      const modes: FaceMode[] = ["pinyin", "hanzi", "both", "english"]
      setActualFaceMode(modes[Math.floor(Math.random() * modes.length)])
    } else {
      setActualFaceMode(faceMode)
    }
  }, [faceMode, currentCard])

  // Initialize streak and level from user stats
  useEffect(() => {
    if (userStats) {
      setStreak(userStats.currentStreak)
      setLevel(userStats.level)
    }
  }, [userStats])

  // Prefetch next 3 test questions when index changes
  useEffect(() => {
    if (reviewMode !== "classic" && reviewMode !== "narrative" && shuffledCards.length > 0 && isStarted) {
      const nextCards = []
      for (let i = 1; i <= 3; i++) {
        const nextIndex = currentIndex + i
        if (nextIndex < shuffledCards.length) {
          nextCards.push(shuffledCards[nextIndex].id)
        }
      }

      if (nextCards.length > 0) {
        prefetchMutation.mutate({
          cardIds: nextCards,
          direction: testDirection
        })
      }
    }
    // Don't include prefetchMutation in deps - it's a stable mutation function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, reviewMode, testDirection, shuffledCards, isStarted])

  const handleStart = () => {
    // Snapshot the current cards for this session
    if (cards && cards.length > 0) {
      setSessionCards(cards)
    }
    setIsStarted(true)
    setCurrentIndex(0)
    setResults({ again: 0, hard: 0, good: 0, easy: 0, totalXp: 0 })
    setExamples({})
    refetch()
  }

  // Auto-start session when coming from direct lesson link (Learn button)
  useEffect(() => {
    if (urlLessonId && urlMode === "narrative" && cards && cards.length > 0 && !isStarted) {
      handleStart()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlLessonId, urlMode, cards, isStarted])

  const handleAnswer = (quality: Quality) => {
    if (!currentCard || isProcessing.current) return

    // Prevent rapid double-clicks
    isProcessing.current = true
    setTimeout(() => {
      isProcessing.current = false
    }, 100)

    // Optimistically update UI immediately
    const estimatedXp = quality === Quality.AGAIN ? 1 : quality === Quality.HARD ? 5 : quality === Quality.GOOD ? 10 : 15

    setResults((prev) => ({
      again: prev.again + (quality === Quality.AGAIN ? 1 : 0),
      hard: prev.hard + (quality === Quality.HARD ? 1 : 0),
      good: prev.good + (quality === Quality.GOOD ? 1 : 0),
      easy: prev.easy + (quality === Quality.EASY ? 1 : 0),
      totalXp: prev.totalXp + estimatedXp
    }))

    // Move to next card immediately
    setCurrentIndex((prev) => prev + 1)

    // Submit to API in background
    submitReviewMutation.mutate(
      {
        cardId: currentCard.id,
        quality
      },
      {
        onSuccess: (result) => {
          // Update with actual XP (may differ due to bonuses)
          const xpDiff = result.xpEarned - estimatedXp
          if (xpDiff !== 0) {
            setResults((prev) => ({
              ...prev,
              totalXp: prev.totalXp + xpDiff
            }))
          }

          // Update streak and level
          setStreak(result.stats.currentStreak)
          setLevel(result.stats.level)

          // Show XP toast
          if (result.xpEarned > 0) {
            toast.success(`+${result.xpEarned} XP`, {
              duration: 1500,
              position: "top-center"
            })
          }

          // Show achievement toast
          if (result.newAchievements && result.newAchievements.length > 0) {
            for (const achievement of result.newAchievements) {
              toast.success(`Achievement Unlocked: ${achievement.name}!`, {
                description: `+${achievement.xpReward} XP`,
                duration: 3000
              })
            }
          }
        },
        onError: () => {
          toast.error("Failed to save result")
        }
      }
    )
  }

  const handleTestAnswer = (isCorrect: boolean, userAnswer: string) => {
    // Map test result to Quality
    // Multiple choice test mode: correct = HARD (1), incorrect = AGAIN (0)
    const quality = isCorrect ? Quality.HARD : Quality.AGAIN

    // Use existing handleAnswer logic
    handleAnswer(quality)
  }

  const handleGenerateExample = async () => {
    if (!currentCard) return

    try {
      const example = await generateSentenceMutation.mutateAsync({
        grammarPoint: `${currentCard.hanzi} (${currentCard.pinyin}): ${currentCard.english}`,
        context: currentCard.notes
      })

      setExamples((prev) => ({
        ...prev,
        [currentCard.id]: example
      }))
    } catch {
      toast.error("Failed to generate example")
    }
  }

  // Session complete view
  if (isComplete) {
    return (
      <ErrorBoundary>
        <SessionComplete
          results={results}
          reviewMode={reviewMode}
          streak={streak}
          level={level}
          onRestart={handleStart}
        />
      </ErrorBoundary>
    )
  }

  // Settings view
  if (!isStarted) {
    return (
      <ErrorBoundary>
        <ReviewSettings
          reviewMode={reviewMode}
          onReviewModeChange={setReviewMode}
          testDirection={testDirection}
          onTestDirectionChange={setTestDirection}
          faceMode={faceMode}
          onFaceModeChange={setFaceMode}
          cardLimit={cardLimit}
          onCardLimitChange={setCardLimit}
          allCards={allCards}
          onAllCardsChange={setAllCards}
          selectedTypes={selectedTypes}
          onSelectedTypesChange={setSelectedTypes}
          selectedTags={selectedTags}
          onSelectedTagsChange={setSelectedTags}
          selectedLesson={selectedLesson}
          onSelectedLessonChange={setSelectedLesson}
          availableTags={availableTags}
          reviewData={reviewData ? {
            dueCount: reviewData.dueCount,
            totalCards: reviewData.totalCards
          } : null}
          isLoading={isLoading}
          onStart={handleStart}
        />
      </ErrorBoundary>
    )
  }

  // No cards available
  if (!isLoading && shuffledCards.length === 0) {
    return (
      <ErrorBoundary>
        <NoCardsView />
      </ErrorBoundary>
    )
  }

  // Review session view
  return (
    <ErrorBoundary>
    <div className="max-w-md mx-auto space-y-6">
      <SessionHeader
        currentIndex={currentIndex}
        totalCards={shuffledCards.length}
        totalXp={results.totalXp}
        correctCount={results.good + results.easy}
        incorrectCount={results.again + results.hard}
        progress={progress}
      />

      {currentLesson && (
        <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Reviewing: Lesson {currentLesson.number}
            {currentLesson.title && ` - ${currentLesson.title}`}
          </span>
        </div>
      )}

      {currentCard && (
        <>
          {reviewMode === "narrative" ? (
            <NarrativeMode
              card={currentCard}
              lessonNotes={currentLesson?.notes}
              lessonCards={shuffledCards}
              onAnswer={handleAnswer}
              cardNumber={currentIndex + 1}
              totalCards={shuffledCards.length}
            />
          ) : reviewMode === "classic" ? (
            <Flashcard
              card={currentCard}
              faceMode={actualFaceMode}
              onAnswer={handleAnswer}
              onGenerateExample={handleGenerateExample}
              exampleSentence={examples[currentCard.id]}
              isGenerating={generateSentenceMutation.isPending}
            />
          ) : (
            <TestCard
              card={currentCard}
              mode="multiple_choice"
              direction={testDirection}
              onAnswer={handleTestAnswer}
            />
          )}
        </>
      )}

      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsStarted(false)
            setCurrentIndex(0)
            setSessionCards([])
          }}
        >
          End Session
        </Button>
      </div>
    </div>
      </ErrorBoundary>
  )
}
