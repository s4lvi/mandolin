"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  useReviewCards,
  useSubmitReview,
  useGenerateSentence
} from "@/hooks/use-review"
import { Flashcard } from "@/components/review/flashcard"
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
import { BookOpen, Trophy } from "lucide-react"
import { toast } from "sonner"
import type { Card as CardType, FaceMode, ExampleSentence } from "@/types"

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

export default function ReviewPage() {
  const router = useRouter()
  const [isStarted, setIsStarted] = useState(false)
  const [faceMode, setFaceMode] = useState<FaceMode>("hanzi")
  const [cardLimit, setCardLimit] = useState("20")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<{ correct: number; incorrect: number }>({
    correct: 0,
    incorrect: 0
  })
  const [examples, setExamples] = useState<Record<string, ExampleSentence>>({})
  const [actualFaceMode, setActualFaceMode] = useState<FaceMode>("hanzi")

  const {
    data: cards,
    isLoading,
    refetch
  } = useReviewCards({
    limit: parseInt(cardLimit)
  })

  const submitReviewMutation = useSubmitReview()
  const generateSentenceMutation = useGenerateSentence()

  // Shuffle cards when starting
  const shuffledCards = useMemo(() => {
    if (!cards) return []
    return [...cards].sort(() => Math.random() - 0.5)
  }, [cards])

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

  const handleStart = () => {
    setIsStarted(true)
    setCurrentIndex(0)
    setResults({ correct: 0, incorrect: 0 })
    setExamples({})
    refetch()
  }

  const handleAnswer = async (correct: boolean) => {
    if (!currentCard) return

    try {
      await submitReviewMutation.mutateAsync({
        cardId: currentCard.id,
        correct
      })

      setResults((prev) => ({
        correct: prev.correct + (correct ? 1 : 0),
        incorrect: prev.incorrect + (correct ? 0 : 1)
      }))

      setCurrentIndex((prev) => prev + 1)
    } catch {
      toast.error("Failed to save result")
    }
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
    const total = results.correct + results.incorrect
    const percentage = total > 0 ? Math.round((results.correct / total) * 100) : 0

    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
            <CardTitle>Session Complete!</CardTitle>
            <CardDescription>Great work reviewing your cards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{percentage}%</p>
              <p className="text-muted-foreground">Accuracy</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {results.correct}
                </p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">
                  {results.incorrect}
                </p>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/deck")}
              >
                Back to Deck
              </Button>
              <Button className="flex-1" onClick={handleStart}>
                Review Again
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
          <span>
            {results.correct} correct, {results.incorrect} incorrect
          </span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {currentCard && (
        <Flashcard
          card={currentCard}
          faceMode={actualFaceMode}
          onCorrect={() => handleAnswer(true)}
          onIncorrect={() => handleAnswer(false)}
          onGenerateExample={handleGenerateExample}
          exampleSentence={examples[currentCard.id]}
          isGenerating={generateSentenceMutation.isPending}
        />
      )}

      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsStarted(false)
            setCurrentIndex(0)
          }}
        >
          End Session
        </Button>
      </div>
    </div>
  )
}
