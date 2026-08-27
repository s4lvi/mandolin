"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  useReviewCards,
  useSubmitReview,
  useGenerateSentence
} from "@/hooks/use-review"
import { usePrefetchTestQuestions } from "@/hooks/use-test-questions"
import { useLessons } from "@/hooks/use-lessons"
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences"
import {
  readSessionStorage,
  writeSessionStorage,
  removeSessionStorage,
  useBeforeUnloadGuard
} from "@/hooks/use-session-storage"
import { Flashcard, Quality } from "@/components/review/flashcard"
import { TestCard } from "@/components/review/test-card"
import { RecallCard } from "@/components/review/recall-card"
import { ListeningCard } from "@/components/review/listening-card"
import { SessionComplete } from "@/components/review/session-complete"
import { ReviewSettings } from "@/components/review/review-settings"
import { SessionHeader } from "@/components/review/session-header"
import { NoCardsView } from "@/components/review/no-cards-view"
import { isEditableTarget } from "@/components/review/review-keys"
import { ErrorBoundaryWithRouter as ErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Undo2, Loader2, RotateCcw } from "lucide-react"
import { isNative } from "@/lib/capacitor"
import { isNewCard } from "@/lib/srs"
import { REVIEW_DEFAULTS } from "@/lib/constants/review"
import { DEFAULT_REVIEW_PREFS, type ReviewPrefs } from "@/lib/validations/preferences"
import type { StatsResponse } from "@/types/api-responses"
import { toast } from "sonner"
import type { Card as CardType, FaceMode, ExampleSentence, ReviewMode, TestDirection } from "@/types"

interface LastAnswer {
  cardId: string
  quality: Quality
  estimatedXp: number
  /** Set once the server acknowledges the review; required for a real undo */
  historyId?: string
  /** Server call failed; local undo only */
  failed?: boolean
}

interface SessionResults {
  again: number
  hard: number
  good: number
  easy: number
  totalXp: number
}

const EMPTY_RESULTS: SessionResults = { again: 0, hard: 0, good: 0, easy: 0, totalXp: 0 }

/** What gets persisted to sessionStorage so an interrupted session can resume */
interface PersistedSession {
  version: 1
  cards: CardType[]
  currentIndex: number
  results: SessionResults
  missedCardIds: string[]
  lastAnswer: LastAnswer | null
  reviewMode: ReviewMode
  faceMode: FaceMode
  testDirection: TestDirection
  lessonId: string | null
  isDrill: boolean
}

// The persisted prefs use "test" while the page's ReviewMode uses "test_easy"
function prefToReviewMode(mode: ReviewPrefs["reviewMode"]): ReviewMode {
  return mode === "test" ? "test_easy" : mode
}
function reviewModeToPref(mode: ReviewMode): ReviewPrefs["reviewMode"] {
  return mode === "test_easy" ? "test" : mode
}
function prefToTestDirection(dir: ReviewPrefs["testDirection"]): TestDirection {
  return dir
}

function shuffleCards(cards: CardType[]): CardType[] {
  const arr = [...cards]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch("/api/stats")
  if (!res.ok) throw new Error("Failed to fetch stats")
  return res.json()
}

export default function ReviewPage() {
  const searchParams = useSearchParams()
  const { data: authSession } = useSession()

  // Read URL parameters for direct lesson access
  const urlLessonId = searchParams.get("lessonId")
  const urlMode = searchParams.get("mode") as ReviewMode | null

  // ---- Persisted preferences -------------------------------------------
  const { data: prefsData, isPlaceholderData: prefsArePlaceholder } = usePreferences()
  const updatePrefs = useUpdatePreferences()
  const prefs = prefsData?.reviewPrefs ?? DEFAULT_REVIEW_PREFS
  const prefsSeeded = useRef(false)

  const [isStarted, setIsStarted] = useState(false)
  const [faceMode, setFaceMode] = useState<FaceMode>(prefs.faceMode)
  const [reviewMode, setReviewMode] = useState<ReviewMode>(urlMode || prefToReviewMode(prefs.reviewMode))
  const [testDirection, setTestDirection] = useState<TestDirection>(prefToTestDirection(prefs.testDirection))
  const [cardLimit, setCardLimit] = useState(String(prefs.cardLimit))
  const [allCards, setAllCards] = useState(prefs.includeAllCards)
  const [selectedTags, setSelectedTags] = useState<string[]>(prefs.selectedTags)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(prefs.selectedTypes)
  const [newLimit, setNewLimit] = useState(prefs.newCardsPerSession)
  const [showHardButton, setShowHardButton] = useState(prefs.showHardButton)
  const [autoPlayAudio, setAutoPlayAudio] = useState(prefs.autoPlayAudio)
  const [selectedLesson, setSelectedLesson] = useState<string>(urlLessonId || "all")

  // Seed once from the server-side prefs (URL params still win)
  useEffect(() => {
    if (prefsSeeded.current || prefsArePlaceholder || !prefsData) return
    prefsSeeded.current = true
    const p = prefsData.reviewPrefs
    setFaceMode(p.faceMode)
    setReviewMode(urlMode || prefToReviewMode(p.reviewMode))
    setTestDirection(prefToTestDirection(p.testDirection))
    setCardLimit(String(p.cardLimit))
    setAllCards(p.includeAllCards)
    setSelectedTags(p.selectedTags)
    setSelectedTypes(p.selectedTypes)
    setNewLimit(p.newCardsPerSession)
    setShowHardButton(p.showHardButton)
    setAutoPlayAudio(p.autoPlayAudio)
  }, [prefsData, prefsArePlaceholder, urlMode])

  const buildPrefsPatch = useCallback((): Partial<ReviewPrefs> => {
    const limit = parseInt(cardLimit, 10)
    const patch: Partial<ReviewPrefs> = {
      reviewMode: reviewModeToPref(reviewMode),
      faceMode,
      includeAllCards: allCards,
      selectedTags,
      selectedTypes,
      showHardButton,
      autoPlayAudio,
      newCardsPerSession: newLimit
    }
    if (!Number.isNaN(limit)) {
      patch.cardLimit = Math.min(
        REVIEW_DEFAULTS.MAX_CARD_LIMIT,
        Math.max(REVIEW_DEFAULTS.MIN_CARD_LIMIT, limit)
      )
    }
    // PINYIN_TO_HANZI is not part of the persisted schema; leave the saved value alone
    if (testDirection === "HANZI_TO_MEANING" || testDirection === "MEANING_TO_HANZI") {
      patch.testDirection = testDirection
    }
    return patch
  }, [cardLimit, reviewMode, faceMode, allCards, selectedTags, selectedTypes, showHardButton, autoPlayAudio, newLimit, testDirection])

  // Debounced save whenever a setting differs from what the server last had
  const savePrefs = updatePrefs.mutate
  const prefsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedPrefs = useRef<string | null>(null)
  useEffect(() => {
    if (!prefsSeeded.current || prefsArePlaceholder || !prefsData) return
    const patch = buildPrefsPatch()
    // Compare against the server copy (merged with this patch) so we never
    // save a no-op and never miss the user's first change.
    const merged = JSON.stringify({ ...prefsData.reviewPrefs, ...patch })
    const server = JSON.stringify(prefsData.reviewPrefs)
    if (merged === server || merged === lastSavedPrefs.current) return
    if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current)
    prefsSaveTimer.current = setTimeout(() => {
      lastSavedPrefs.current = merged
      savePrefs({ reviewPrefs: patch })
    }, REVIEW_DEFAULTS.PREFS_SAVE_DEBOUNCE_MS)
    return () => {
      if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current)
    }
  }, [buildPrefsPatch, savePrefs, prefsData, prefsArePlaceholder])

  // ---- Session state ------------------------------------------------------
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<SessionResults>(EMPTY_RESULTS)
  const [examples, setExamples] = useState<Record<string, ExampleSentence>>({})
  const [actualFaceMode, setActualFaceMode] = useState<FaceMode>("hanzi")
  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [sessionCards, setSessionCards] = useState<CardType[]>([])
  const [sessionLessonId, setSessionLessonId] = useState<string | null>(null)
  const [missedCards, setMissedCards] = useState<CardType[]>([])
  const [lastAnswer, setLastAnswer] = useState<LastAnswer | null>(null)
  const [isDrill, setIsDrill] = useState(false)
  const [endedEarly, setEndedEarly] = useState(false)
  const [pendingResume, setPendingResume] = useState<PersistedSession | null>(null)
  const isProcessing = useRef(false)

  const parsedLimit = parseInt(cardLimit, 10)
  const {
    data: reviewData,
    isLoading,
    refetch
  } = useReviewCards({
    limit: Number.isNaN(parsedLimit) ? REVIEW_DEFAULTS.DEFAULT_CARD_LIMIT : parsedLimit,
    allCards,
    tagIds: selectedTags,
    types: selectedTypes,
    lessonId: selectedLesson !== "all" ? selectedLesson : undefined,
    newLimit
  })

  const { data: statsData } = useQuery({
    queryKey: ["user-stats"],
    queryFn: fetchStats,
    staleTime: 60 * 1000
  })

  const availableTags = reviewData?.availableTags || []
  const cards = reviewData?.cards
  const userStats = reviewData?.userStats

  const submitReviewMutation = useSubmitReview()
  const undoMutation = submitReviewMutation.undo
  const generateSentenceMutation = useGenerateSentence()
  const prefetchMutation = usePrefetchTestQuestions()
  const { data: lessons } = useLessons()

  // Find selected lesson for display
  const activeLessonId = isStarted ? sessionLessonId : selectedLesson !== "all" ? selectedLesson : null
  const currentLesson = activeLessonId && lessons && Array.isArray(lessons)
    ? lessons.find(l => l.id === activeLessonId)
    : null

  const currentCard = sessionCards[currentIndex]
  const progress = sessionCards.length
    ? ((currentIndex) / sessionCards.length) * 100
    : 0
  const isComplete = isStarted && sessionCards.length > 0 && (endedEarly || currentIndex >= sessionCards.length)
  const sessionActive = isStarted && sessionCards.length > 0 && !isComplete

  // ---- Session persistence -------------------------------------------------
  const userKey = authSession?.user?.id ?? authSession?.user?.email ?? null
  const storageKey = userKey ? `${REVIEW_DEFAULTS.SESSION_STORAGE_PREFIX}${userKey}` : null

  // On mount (once we know who the user is) look for an interrupted session
  const checkedResume = useRef(false)
  useEffect(() => {
    if (!storageKey || checkedResume.current) return
    checkedResume.current = true
    const saved = readSessionStorage<PersistedSession>(storageKey)
    if (
      saved &&
      saved.version === 1 &&
      Array.isArray(saved.cards) &&
      saved.cards.length > 0 &&
      saved.currentIndex < saved.cards.length
    ) {
      setPendingResume(saved)
    } else if (saved) {
      removeSessionStorage(storageKey)
    }
  }, [storageKey])

  // Persist while a session is in progress
  useEffect(() => {
    if (!storageKey || !sessionActive) return
    const snapshot: PersistedSession = {
      version: 1,
      cards: sessionCards,
      currentIndex,
      results,
      missedCardIds: missedCards.map((c) => c.id),
      lastAnswer,
      reviewMode,
      faceMode,
      testDirection,
      lessonId: sessionLessonId,
      isDrill
    }
    writeSessionStorage(storageKey, snapshot)
  }, [storageKey, sessionActive, sessionCards, currentIndex, results, missedCards, lastAnswer, reviewMode, faceMode, testDirection, sessionLessonId, isDrill])

  const clearPersistedSession = useCallback(() => {
    if (storageKey) removeSessionStorage(storageKey)
  }, [storageKey])

  useBeforeUnloadGuard(sessionActive)

  // Refresh due count / stats / cards once when the session finishes
  const completeSession = submitReviewMutation.completeSession
  useEffect(() => {
    if (isComplete) {
      completeSession()
      clearPersistedSession()
    }
  }, [isComplete, completeSession, clearPersistedSession])

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
    if (reviewMode === "test_easy" && sessionCards.length > 0 && sessionActive) {
      const nextCards = []
      for (let i = 1; i <= REVIEW_DEFAULTS.PREFETCH_AHEAD; i++) {
        const nextIndex = currentIndex + i
        if (nextIndex < sessionCards.length) {
          nextCards.push(sessionCards[nextIndex].id)
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
  }, [currentIndex, reviewMode, testDirection, sessionCards, sessionActive])

  // ---- Session lifecycle ----------------------------------------------------
  const resetSessionState = (nextCards: CardType[], drill: boolean) => {
    setSessionCards(shuffleCards(nextCards))
    setIsStarted(true)
    setIsDrill(drill)
    setEndedEarly(false)
    setCurrentIndex(0)
    setResults(EMPTY_RESULTS)
    setMissedCards([])
    setLastAnswer(null)
    setExamples({})
    setPendingResume(null)
  }

  const handleStart = () => {
    // Flush any pending preference save right away
    if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current)
    if (prefsSeeded.current) savePrefs({ reviewPrefs: buildPrefsPatch() })

    setSessionLessonId(selectedLesson !== "all" ? selectedLesson : null)
    // Snapshot the current cards for this session
    resetSessionState(cards ?? [], false)
    refetch()
  }

  const handleDrillMissed = () => {
    if (missedCards.length === 0) return
    resetSessionState(missedCards, true)
  }

  const handleResume = () => {
    if (!pendingResume) return
    const s = pendingResume
    const missedSet = new Set(s.missedCardIds)
    setReviewMode(s.reviewMode)
    setFaceMode(s.faceMode)
    setTestDirection(s.testDirection)
    setSessionLessonId(s.lessonId)
    setSessionCards(s.cards)
    setCurrentIndex(s.currentIndex)
    setResults(s.results)
    setMissedCards(s.cards.filter((c) => missedSet.has(c.id)))
    setLastAnswer(s.lastAnswer)
    setIsDrill(s.isDrill)
    setEndedEarly(false)
    setExamples({})
    setIsStarted(true)
    setPendingResume(null)
  }

  const handleDiscardResume = () => {
    clearPersistedSession()
    setPendingResume(null)
  }

  const handleEndSession = () => {
    if (results.again + results.hard + results.good + results.easy === 0) {
      // Nothing rated yet: just go back to the start screen
      clearPersistedSession()
      setIsStarted(false)
      setSessionCards([])
      setLastAnswer(null)
      return
    }
    setEndedEarly(true)
  }

  const handleAnswer = (quality: Quality) => {
    if (!currentCard || isProcessing.current) return

    // Prevent rapid double-clicks
    isProcessing.current = true
    setTimeout(() => {
      isProcessing.current = false
    }, 100)

    const answeredCard = currentCard
    // Optimistically update UI immediately
    const estimatedXp = isDrill
      ? 0
      : quality === Quality.AGAIN ? 1 : quality === Quality.HARD ? 5 : quality === Quality.GOOD ? 10 : 15

    // Track for undo (only the most recent answer can be undone)
    setLastAnswer({ cardId: answeredCard.id, quality, estimatedXp })

    // Track missed cards for drill-again
    if (quality === Quality.AGAIN) {
      setMissedCards((prev) => [...prev, answeredCard])
    }

    setResults((prev) => ({
      again: prev.again + (quality === Quality.AGAIN ? 1 : 0),
      hard: prev.hard + (quality === Quality.HARD ? 1 : 0),
      good: prev.good + (quality === Quality.GOOD ? 1 : 0),
      easy: prev.easy + (quality === Quality.EASY ? 1 : 0),
      totalXp: prev.totalXp + estimatedXp
    }))

    // Move to next card immediately
    setCurrentIndex((prev) => prev + 1)

    // Drill = pure local practice; never touches the SRS
    if (isDrill) return

    // Submit to API in background
    submitReviewMutation.mutate(
      {
        cardId: answeredCard.id,
        quality,
        source: "REVIEW"
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

          // Attach the history id so this answer can be undone server-side
          setLastAnswer((prev) =>
            prev && prev.cardId === answeredCard.id
              ? { ...prev, historyId: result.historyId, estimatedXp: result.xpEarned }
              : prev
          )

          // Update streak and level
          setStreak(result.stats.currentStreak)
          setLevel(result.stats.level)

          // Haptic on correct answer
          if (quality >= Quality.GOOD && isNative()) {
            import("@capacitor/haptics").then(({ Haptics, NotificationType }) =>
              Haptics.notification({ type: NotificationType.Success })
            ).catch(() => {})
          }

          // Show achievement toast (skip per-card XP toasts to avoid spam)
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
          setLastAnswer((prev) =>
            prev && prev.cardId === answeredCard.id ? { ...prev, failed: true } : prev
          )
          toast.error("Failed to save result")
        }
      }
    )
  }

  const revertLocalAnswer = useCallback((answer: LastAnswer, restoredCard?: CardType) => {
    const q = answer.quality
    setResults((prev) => ({
      again: prev.again - (q === Quality.AGAIN ? 1 : 0),
      hard: prev.hard - (q === Quality.HARD ? 1 : 0),
      good: prev.good - (q === Quality.GOOD ? 1 : 0),
      easy: prev.easy - (q === Quality.EASY ? 1 : 0),
      totalXp: Math.max(0, prev.totalXp - answer.estimatedXp)
    }))
    if (q === Quality.AGAIN) {
      setMissedCards((prev) => {
        const idx = prev.map((c) => c.id).lastIndexOf(answer.cardId)
        if (idx === -1) return prev
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
      })
    }
    if (restoredCard) {
      // Refresh the card's SRS fields so interval previews are accurate again
      setSessionCards((prev) =>
        prev.map((c) => (c.id === restoredCard.id ? { ...c, ...restoredCard } : c))
      )
    }
    setCurrentIndex((prev) => Math.max(0, prev - 1))
    setLastAnswer(null)
  }, [])

  const undoPending = undoMutation.isPending
  const canUndo =
    !!lastAnswer &&
    currentIndex > 0 &&
    !undoPending &&
    (isDrill || !!lastAnswer.historyId || !!lastAnswer.failed)

  const handleUndo = useCallback(() => {
    if (!lastAnswer || currentIndex === 0 || undoPending) return

    // Drill answers and failed submissions never reached the server
    if (isDrill || lastAnswer.failed || !lastAnswer.historyId) {
      if (!isDrill && !lastAnswer.failed) return // still waiting on the server
      revertLocalAnswer(lastAnswer)
      return
    }

    const answer = lastAnswer
    undoMutation.mutate(
      { historyId: answer.historyId! },
      {
        onSuccess: (data) => {
          revertLocalAnswer(answer, data.card)
          setStreak(data.stats.currentStreak)
          setLevel(data.stats.level)
          toast.info("Rating undone")
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to undo")
        }
      }
    )
  }, [lastAnswer, currentIndex, undoPending, isDrill, undoMutation, revertLocalAnswer])

  // U = undo (desktop shortcut)
  useEffect(() => {
    if (!sessionActive) return
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      if (isEditableTarget(e.target)) return
      if (e.key === "u" || e.key === "U") {
        e.preventDefault()
        if (canUndo) handleUndo()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [sessionActive, canUndo, handleUndo])

  const handleTestAnswer = (isCorrect: boolean) => {
    // Multiple choice test mode: correct = GOOD (2), incorrect = AGAIN (0)
    handleAnswer(isCorrect ? Quality.GOOD : Quality.AGAIN)
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

  // Due/new mix for the start screen, computed from the actual session cards
  const startScreenData = useMemo(() => {
    if (!reviewData) return null
    const list = reviewData.cards ?? []
    const newInSession = list.filter(isNewCard).length
    return {
      dueCount: reviewData.dueCount,
      totalCards: reviewData.totalCards,
      dueInSession: list.length - newInSession,
      newInSession,
      sessionSize: list.length
    }
  }, [reviewData])

  const startStats = statsData?.stats
    ? {
        currentStreak: statsData.stats.currentStreak,
        dailyGoal: statsData.stats.dailyGoal,
        dailyProgress: statsData.stats.dailyProgress
      }
    : userStats
      ? {
          currentStreak: userStats.currentStreak,
          dailyGoal: userStats.dailyGoal,
          dailyProgress: userStats.dailyProgress
        }
      : null

  // ---- Views ------------------------------------------------------------------

  // Session complete view (also used when the user ends early)
  if (isComplete) {
    return (
      <ErrorBoundary>
        <SessionComplete
          results={results}
          reviewMode={reviewMode}
          streak={streak}
          level={level}
          onRestart={handleStart}
          missedCards={missedCards}
          onDrillMissed={missedCards.length > 0 ? handleDrillMissed : undefined}
          lessonId={sessionLessonId}
          endedEarly={endedEarly && currentIndex < sessionCards.length}
          totalCards={sessionCards.length}
          isDrill={isDrill}
          showHard={showHardButton}
        />
      </ErrorBoundary>
    )
  }

  // Resume prompt for an interrupted session
  if (!isStarted && pendingResume) {
    return (
      <ErrorBoundary>
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <RotateCcw className="h-10 w-10 text-primary mx-auto" />
              <div>
                <h2 className="text-xl font-bold">Pick up where you left off?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  You have an unfinished {pendingResume.isDrill ? "practice" : "review"} session
                  ({pendingResume.currentIndex}/{pendingResume.cards.length} cards done).
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="w-full min-h-[44px]" onClick={handleResume}>
                  Resume session ({pendingResume.currentIndex}/{pendingResume.cards.length})
                </Button>
                <Button variant="outline" className="w-full min-h-[44px]" onClick={handleDiscardResume}>
                  Discard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    )
  }

  // Start screen
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
          newLimit={newLimit}
          onNewLimitChange={setNewLimit}
          showHardButton={showHardButton}
          onShowHardButtonChange={setShowHardButton}
          autoPlayAudio={autoPlayAudio}
          onAutoPlayAudioChange={setAutoPlayAudio}
          availableTags={availableTags}
          reviewData={startScreenData}
          stats={startStats}
          isLoading={isLoading}
          onStart={handleStart}
        />
      </ErrorBoundary>
    )
  }

  // No cards available
  if (!isLoading && sessionCards.length === 0) {
    return (
      <ErrorBoundary>
        <NoCardsView
          hasCards={(reviewData?.totalCards ?? 0) > 0}
          onReviewAnyway={
            !allCards && (reviewData?.totalCards ?? 0) > 0
              ? () => {
                  setAllCards(true)
                  setIsStarted(false)
                }
              : undefined
          }
        />
      </ErrorBoundary>
    )
  }

  const answeredCount = results.again + results.hard + results.good + results.easy

  // Review session view
  return (
    <ErrorBoundary>
    <div className="max-w-md mx-auto space-y-4 md:space-y-6 px-1">
      <SessionHeader
        currentIndex={currentIndex}
        totalCards={sessionCards.length}
        totalXp={results.totalXp}
        correctCount={results.hard + results.good + results.easy}
        incorrectCount={results.again}
        progress={progress}
      />

      {isDrill ? (
        <div className="flex items-center justify-center gap-2 p-2 bg-muted rounded-lg">
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Practicing missed cards (doesn&apos;t affect scheduling)
          </span>
        </div>
      ) : currentLesson ? (
        <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Reviewing: Lesson {currentLesson.number}
            {currentLesson.title && ` - ${currentLesson.title}`}
          </span>
        </div>
      ) : null}

      {currentCard && (
        <>
          {reviewMode === "classic" ? (
            <Flashcard
              card={currentCard}
              faceMode={actualFaceMode}
              onAnswer={handleAnswer}
              onGenerateExample={handleGenerateExample}
              exampleSentence={examples[currentCard.id]}
              isGenerating={generateSentenceMutation.isPending}
              isSubmitting={undoPending}
              autoPlayAudio={autoPlayAudio}
              showHard={showHardButton}
            />
          ) : reviewMode === "recall" ? (
            <RecallCard
              card={currentCard}
              faceMode={actualFaceMode}
              onAnswer={handleAnswer}
              autoPlayAudio={autoPlayAudio}
              showHard={showHardButton}
              disabled={undoPending}
            />
          ) : reviewMode === "listening" ? (
            <ListeningCard
              card={currentCard}
              onAnswer={handleAnswer}
              autoPlayAudio={autoPlayAudio}
              showHard={showHardButton}
              disabled={undoPending}
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

      <div className="flex items-center justify-center gap-2">
        {lastAnswer && currentIndex > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo last rating (U)"
          >
            {undoPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Undo2 className="h-4 w-4 mr-1" />
            )}
            Undo
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleEndSession}>
          {answeredCount > 0 ? "End Session" : "Cancel"}
        </Button>
      </div>
    </div>
      </ErrorBoundary>
  )
}
