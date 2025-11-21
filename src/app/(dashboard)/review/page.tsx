"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  useReviewCards,
  useSubmitReview,
  useGenerateSentence
} from "@/hooks/use-review"
import { usePrefetchTestQuestions } from "@/hooks/use-test-questions"
import { Flashcard, Quality } from "@/components/review/flashcard"
import { TestCard } from "@/components/review/test-card"
import { ErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { BookOpen, Trophy, Flame, Star, Zap, Tags } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import type { Card as CardType, FaceMode, ExampleSentence, ReviewMode, TestDirection } from "@/types"

// Add Progress component since we need it
function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`h-2 w-full bg-secondary rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

interface SessionResults {
  again: number
  hard: number
  good: number
  easy: number
  totalXp: number
}

export default function ReviewPage() {
  const router = useRouter()
  const [isStarted, setIsStarted] = useState(false)
  const [faceMode, setFaceMode] = useState<FaceMode>("hanzi")
  const [reviewMode, setReviewMode] = useState<ReviewMode>("classic")
  const [testDirection, setTestDirection] = useState<TestDirection>("HANZI_TO_MEANING")
  const [cardLimit, setCardLimit] = useState("20")
  const [allCards, setAllCards] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
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
    types: selectedTypes
  })

  const availableTags = reviewData?.availableTags || []
  const cardTypes = ["VOCABULARY", "GRAMMAR", "PHRASE", "IDIOM"]

  const cards = reviewData?.cards
  const userStats = reviewData?.userStats

  const submitReviewMutation = useSubmitReview()
  const generateSentenceMutation = useGenerateSentence()
  const prefetchMutation = usePrefetchTestQuestions()

  // Shuffle cards from session snapshot (frozen at session start)
  const shuffledCards = useMemo(() => {
    if (sessionCards.length === 0) return []
    return [...sessionCards].sort(() => Math.random() - 0.5)
  }, [sessionCards])

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
    if (reviewMode !== "classic" && shuffledCards.length > 0 && isStarted) {
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
    // Easy mode (multiple choice): correct = HARD (1), incorrect = AGAIN (0)
    // Hard mode (text input): correct = GOOD (2), incorrect = AGAIN (0)
    const quality = isCorrect
      ? (reviewMode === "test_hard" ? Quality.GOOD : Quality.HARD)
      : Quality.AGAIN

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
    const total = results.again + results.hard + results.good + results.easy

    // Calculate correct answers based on review mode
    const correct = reviewMode === "classic"
      ? results.good + results.easy  // Classic: good and easy are correct
      : total - results.again         // Test: everything except "again" is correct

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

    return (
      <ErrorBoundary>
        <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
            <CardTitle>Session Complete!</CardTitle>
            <CardDescription>Great work reviewing your cards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* XP and Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Zap className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-yellow-600">+{results.totalXp}</p>
                <p className="text-xs text-muted-foreground">XP Earned</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-orange-600">{streak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Star className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-purple-600">{level}</p>
                <p className="text-xs text-muted-foreground">Level</p>
              </div>
            </div>

            {/* Accuracy */}
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{percentage}%</p>
              <p className="text-muted-foreground">Accuracy</p>
            </div>

            {/* Quality breakdown - conditional display based on mode */}
            {reviewMode === "classic" ? (
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-red-50 rounded">
                  <p className="text-lg font-bold text-red-500">{results.again}</p>
                  <p className="text-xs text-muted-foreground">Again</p>
                </div>
                <div className="p-2 bg-orange-50 rounded">
                  <p className="text-lg font-bold text-orange-500">{results.hard}</p>
                  <p className="text-xs text-muted-foreground">Hard</p>
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <p className="text-lg font-bold text-green-500">{results.good}</p>
                  <p className="text-xs text-muted-foreground">Good</p>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <p className="text-lg font-bold text-blue-500">{results.easy}</p>
                  <p className="text-xs text-muted-foreground">Easy</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-500">{results.again}</p>
                  <p className="text-sm text-muted-foreground">Incorrect</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-500">{correct}</p>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/deck")}
              >
                Back to Deck
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/stats")}
              >
                View Stats
              </Button>
              <Button className="flex-1" onClick={handleStart}>
                Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Settings view
  if (!isStarted) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Review Session</h1>
          <p className="text-muted-foreground">
            Configure your review settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Review Mode</Label>
              <Select
                value={reviewMode}
                onValueChange={(v) => setReviewMode(v as ReviewMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic (Self-Rating)</SelectItem>
                  <SelectItem value="test_easy">Test Mode (Multiple Choice)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reviewMode !== "classic" && (
              <div className="space-y-2">
                <Label>Test Direction</Label>
                <Select
                  value={testDirection}
                  onValueChange={(v) => setTestDirection(v as TestDirection)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HANZI_TO_MEANING">Chinese → Meaning</SelectItem>
                    <SelectItem value="MEANING_TO_HANZI">Meaning → Chinese</SelectItem>
                    <SelectItem value="PINYIN_TO_HANZI">Pinyin → Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {reviewMode === "classic" && (
              <div className="space-y-2">
                <Label>Card Face Display</Label>
                <Select
                  value={faceMode}
                  onValueChange={(v) => setFaceMode(v as FaceMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hanzi">Hanzi Only</SelectItem>
                    <SelectItem value="pinyin">Pinyin Only</SelectItem>
                    <SelectItem value="both">Hanzi + Pinyin</SelectItem>
                    <SelectItem value="english">English Only</SelectItem>
                    <SelectItem value="random">Random</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Number of Cards</Label>
              <Input
                type="number"
                value={cardLimit}
                onChange={(e) => setCardLimit(e.target.value)}
                min="1"
                max="100"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="all-cards">Include All Cards</Label>
                <p className="text-xs text-muted-foreground">
                  Review cards even if not due
                </p>
              </div>
              <Switch
                id="all-cards"
                checked={allCards}
                onCheckedChange={setAllCards}
              />
            </div>

            <div className="space-y-2">
              <Label>Filter by Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {cardTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTypes([...selectedTypes, type])
                        } else {
                          setSelectedTypes(selectedTypes.filter((t) => t !== type))
                        }
                      }}
                    />
                    <label
                      htmlFor={`type-${type}`}
                      className="text-sm cursor-pointer capitalize"
                    >
                      {type.toLowerCase()}
                    </label>
                  </div>
                ))}
              </div>
              {selectedTypes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTypes([])}
                  className="text-xs"
                >
                  Clear type filter
                </Button>
              )}
            </div>

            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Filter by Tags
                </Label>
                <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-2">
                  {availableTags.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag.id}`}
                        checked={selectedTags.includes(tag.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTags([...selectedTags, tag.id])
                          } else {
                            setSelectedTags(selectedTags.filter((id) => id !== tag.id))
                          }
                        }}
                      />
                      <label
                        htmlFor={`tag-${tag.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {tag.name}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTags([])}
                    className="text-xs"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {reviewData && (
              <div className="text-sm text-muted-foreground text-center p-2 bg-muted rounded">
                {allCards ? (
                  <span>{reviewData.totalCards} total cards available</span>
                ) : (
                  <span>{reviewData.dueCount} cards due for review</span>
                )}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleStart}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Start Review"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No cards available
  if (!isLoading && shuffledCards.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">No Cards to Review</h2>
        <p className="text-muted-foreground mb-4">
          Add some cards to your deck first
        </p>
        <Button onClick={() => router.push("/deck")}>Go to Deck</Button>
      </div>
    )
  }

  // Review session view
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {currentIndex + 1} of {shuffledCards.length}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-yellow-500">+{results.totalXp} XP</span>
            <span className="text-green-500">{results.good + results.easy}</span>
            <span>/</span>
            <span className="text-red-500">{results.again + results.hard}</span>
          </span>
        </div>
        <ProgressBar value={progress} />
      </div>

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
            />
          ) : (
            <TestCard
              card={currentCard}
              mode={reviewMode === "test_easy" ? "multiple_choice" : "text_input"}
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
