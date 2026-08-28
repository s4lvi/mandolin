"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Flame, Star, Zap, RotateCcw, Volume2, BookOpen, GraduationCap } from "lucide-react"
import { speakChinese } from "@/lib/speech"
import { useLessons } from "@/hooks/use-lessons"
import type { Card as CardType, ReviewMode } from "@/types"

interface SessionResults {
  again: number
  hard: number
  good: number
  easy: number
  totalXp: number
}

interface SessionCompleteProps {
  results: SessionResults
  reviewMode: ReviewMode
  streak: number
  level: number
  onRestart: () => void
  missedCards?: CardType[]
  onDrillMissed?: () => void
  /** Lesson the session was filtered to, if any */
  lessonId?: string | null
  /** True when the user ended the session before rating every card */
  endedEarly?: boolean
  /** Number of cards the session started with (for the "ended early" note) */
  totalCards?: number
  /** True when this was a local-only practice drill (no XP / scheduling) */
  isDrill?: boolean
  /** Whether the Hard rating is offered; hides the Hard column when false */
  showHard?: boolean
}

export function SessionComplete({
  results,
  reviewMode,
  streak,
  level,
  onRestart,
  missedCards = [],
  onDrillMissed,
  lessonId,
  endedEarly = false,
  totalCards,
  isDrill = false,
  showHard = true
}: SessionCompleteProps) {
  const router = useRouter()
  const { data: lessons } = useLessons()
  const total = results.again + results.hard + results.good + results.easy

  // Calculate correct answers: HARD, GOOD, and EASY all mean the user knew it
  const correct = results.hard + results.good + results.easy

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

  // Pick one specific next action instead of sending the user to a list
  const lessonList = Array.isArray(lessons) ? lessons : []
  const filteredLesson = lessonId ? lessonList.find((l) => l.id === lessonId) : null
  const inProgressLesson = !filteredLesson
    ? lessonList.find(
        (l) => l.lessonProgress && !l.lessonProgress.isComplete && (l._count?.pages ?? 0) > 0
      )
    : null
  const nextLesson = filteredLesson ?? inProgressLesson ?? null

  const showBreakdown = reviewMode === "classic"
  const breakdownCols = showHard ? "grid-cols-4" : "grid-cols-3"

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
          <CardTitle>{endedEarly ? "Session Ended" : isDrill ? "Practice Complete" : "Session Complete!"}</CardTitle>
          <CardDescription>
            {endedEarly && totalCards
              ? `You rated ${total} of ${totalCards} cards`
              : isDrill
                ? "Practice only — nothing was scheduled"
                : "Great work reviewing your cards"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* XP and Stats */}
          {!isDrill && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div className="p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-lg sm:text-xl font-bold text-yellow-600">+{results.totalXp}</p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-lg sm:text-xl font-bold text-orange-600">{streak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mx-auto mb-1" />
                <p className="text-lg sm:text-xl font-bold text-purple-600">{level}</p>
                <p className="text-xs text-muted-foreground">Level</p>
              </div>
            </div>
          )}

          {/* Accuracy */}
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">{percentage}%</p>
            <p className="text-muted-foreground">Accuracy</p>
          </div>

          {/* Quality breakdown - conditional display based on mode */}
          {showBreakdown ? (
            <div className={`grid ${breakdownCols} gap-2 text-center`}>
              <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
                <p className="text-lg font-bold text-red-500">{results.again}</p>
                <p className="text-xs text-muted-foreground">Again</p>
              </div>
              {showHard && (
                <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                  <p className="text-lg font-bold text-orange-500">{results.hard}</p>
                  <p className="text-xs text-muted-foreground">Hard</p>
                </div>
              )}
              <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded">
                <p className="text-lg font-bold text-green-500">{results.good + (showHard ? 0 : results.hard)}</p>
                <p className="text-xs text-muted-foreground">Good</p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                <p className="text-lg font-bold text-blue-500">{results.easy}</p>
                <p className="text-xs text-muted-foreground">Easy</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <p className="text-2xl font-bold text-red-500">{results.again}</p>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-2xl font-bold text-green-500">{correct}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
            </div>
          )}

          {/* Missed cards drill */}
          {missedCards.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-red-600">
                  Missed ({missedCards.length})
                </p>
              </div>
              <div className="space-y-2">
                {missedCards.slice(0, 4).map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg font-bold shrink-0">{card.hanzi}</span>
                      <span className="text-sm text-muted-foreground truncate">{card.pinyin}</span>
                      <span className="text-sm truncate">{card.english}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => speakChinese(card.hanzi)}
                      aria-label="Play pronunciation"
                    >
                      <Volume2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {missedCards.length > 4 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{missedCards.length - 4} more
                  </p>
                )}
              </div>
              {onDrillMissed && (
                <div>
                  <Button variant="outline" className="w-full min-h-[44px]" onClick={onDrillMissed}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Practice missed cards
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center mt-1">
                    Doesn&apos;t affect scheduling
                  </p>
                </div>
              )}
            </div>
          )}

          {/* One specific next step — keep the momentum going */}
          {nextLesson ? (
            <Button
              className="w-full min-h-[44px]"
              onClick={() => router.push(`/lessons/${nextLesson.id}/learn`)}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Continue Lesson {nextLesson.number}
              {nextLesson.lessonProgress && !nextLesson.lessonProgress.isComplete
                ? ` (${nextLesson.lessonProgress.currentPage + 1}/${nextLesson.lessonProgress.totalPages})`
                : ""}
            </Button>
          ) : (
            <Button className="w-full min-h-[44px]" onClick={() => router.push("/courses")}>
              <GraduationCap className="h-4 w-4 mr-2" />
              Start a course
            </Button>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 min-h-[44px]"
              onClick={() => router.push("/stats")}
            >
              View Stats
            </Button>
            <Button variant="outline" className="flex-1 min-h-[44px]" onClick={onRestart}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Review again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
