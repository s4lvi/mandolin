import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Flame, Star, Zap } from "lucide-react"
import type { ReviewMode } from "@/types"

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
}

export function SessionComplete({
  results,
  reviewMode,
  streak,
  level,
  onRestart
}: SessionCompleteProps) {
  const router = useRouter()
  const total = results.again + results.hard + results.good + results.easy

  // Calculate correct answers based on review mode
  const correct = reviewMode === "classic"
    ? results.good + results.easy  // Classic: good and easy are correct
    : total - results.again         // Test: everything except "again" is correct

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

  return (
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
            <Button className="flex-1" onClick={onRestart}>
              Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
