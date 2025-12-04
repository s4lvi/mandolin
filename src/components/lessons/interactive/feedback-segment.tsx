import { Card, CardContent } from "@/components/ui/card"
import { Lightbulb } from "lucide-react"

interface FeedbackSegmentProps {
  userAnswer: string
  correctAnswer: string
  explanation: string
  encouragement?: string
}

export function FeedbackSegment({
  userAnswer,
  correctAnswer,
  explanation,
  encouragement
}: FeedbackSegmentProps) {
  return (
    <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Lightbulb className="h-5 w-5" />
          <span className="font-semibold">Let's Learn Together</span>
        </div>

        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Your answer: </span>
            <span className="text-muted-foreground">{userAnswer}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium">Correct answer: </span>
            <span className="font-bold text-foreground">{correctAnswer}</span>
          </div>
        </div>

        <p className="text-sm leading-relaxed">{explanation}</p>

        {encouragement && (
          <p className="text-sm italic text-muted-foreground border-t pt-3">
            {encouragement}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
