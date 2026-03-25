"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Sparkles, Brain, BookOpen, PenLine } from "lucide-react"

const TIPS = [
  "Spaced repetition is most effective when you review consistently every day",
  "Try the immersion mode to train without the pinyin crutch",
  "Listening mode forces you to connect sound directly to meaning",
  "Characters are built from radicals — tap 'Character Breakdown' on any card",
  "Reading short stories helps you see vocabulary in real context",
  "The recall mode (type your answer) builds stronger memory than recognition",
  "Priority cards appear more often in review sessions",
  "Cards you miss get drilled again at the end of each session",
]

interface AILoadingProps {
  status: string
  statusLabels?: Record<string, string>
}

export function AILoading({ status, statusLabels = {} }: AILoadingProps) {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length))
  const [dots, setDots] = useState("")

  // Rotate dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".")
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Rotate tips every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const defaultLabels: Record<string, string> = {
    idle: "Preparing",
    processing: "Connecting to AI",
    generating_context: "Generating lesson context",
    parsing_cards: "Extracting flashcards",
    streaming: "Processing response",
    generating: "Writing story",
    ...statusLabels
  }

  const label = defaultLabels[status] || "Processing"

  const icons = [Sparkles, Brain, BookOpen, PenLine]
  const Icon = icons[tipIndex % icons.length]

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="py-8">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Animated spinner */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative rounded-full bg-primary/10 p-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>

          {/* Status text */}
          <div>
            <p className="text-lg font-medium">{label}{dots}</p>
            <p className="text-sm text-muted-foreground mt-1">
              This usually takes 15-30 seconds
            </p>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2">
            {["processing", "generating_context", "parsing_cards", "streaming"].map((step, i) => {
              const stepOrder = ["processing", "generating_context", "parsing_cards", "streaming"]
              const currentOrder = stepOrder.indexOf(status)
              const stepIdx = stepOrder.indexOf(step)
              const isActive = stepIdx <= currentOrder
              return (
                <div
                  key={step}
                  className={`h-2 w-8 rounded-full transition-colors duration-500 ${
                    isActive ? "bg-primary" : "bg-muted"
                  }`}
                />
              )
            })}
          </div>

          {/* Tip */}
          <div className="max-w-sm px-4 py-3 bg-background/50 rounded-lg border">
            <div className="flex items-start gap-2">
              <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground text-left">
                <span className="font-medium text-foreground">Tip: </span>
                {TIPS[tipIndex]}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
