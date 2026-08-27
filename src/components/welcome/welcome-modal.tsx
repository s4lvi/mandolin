"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Upload,
  RotateCcw,
  BookOpen,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ChevronLeft
} from "lucide-react"

interface WelcomeModalProps {
  open: boolean
  /** Called whenever the modal closes for any reason (finish, X, Escape, choice). */
  onComplete: () => void
}

const steps = [
  {
    title: "Welcome to Mangolin! 🥭",
    description: "Your AI-powered Mandarin learning companion",
    content: (
      <div className="space-y-4 text-center">
        <div className="text-6xl mb-4">芒果林</div>
        <p className="text-lg">
          Paste your class notes and Mangolin turns them into flashcards, then drills them
          into long-term memory with spaced repetition.
        </p>
        <p className="text-muted-foreground">
          Two minutes to your first review session.
        </p>
      </div>
    )
  },
  {
    title: "Three ways to learn",
    description: "Everything feeds back into your review deck",
    icon: Sparkles,
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <div className="bg-primary text-primary-foreground p-2.5 rounded-full shrink-0">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-semibold">Review</h4>
            <p className="text-sm text-muted-foreground">
              Spaced repetition shows each card right before you would forget it.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <div className="bg-blue-500 text-white p-2.5 rounded-full shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-semibold">Lessons &amp; Courses</h4>
            <p className="text-sm text-muted-foreground">
              Interactive lessons from your own notes, or structured courses to follow.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <div className="bg-green-500 text-white p-2.5 rounded-full shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-semibold">Stories</h4>
            <p className="text-sm text-muted-foreground">
              Short AI stories written only with words you already know, with audio.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Where do you want to start?",
    description: "Pick one — you can always do the other later",
    icon: Upload,
    content: null
  }
]

export function WelcomeModal({ open, onComplete }: WelcomeModalProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  const choose = (href: string) => {
    onComplete()
    router.push(href)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onComplete() }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step.icon && <step.icon className="h-5 w-5" />}
            {step.title}
          </DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isLastStep ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => choose("/upload")}
                className="text-left rounded-lg border-2 border-primary/40 bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
              >
                <Upload className="h-6 w-6 text-primary mb-2" />
                <p className="font-semibold">Paste your class notes</p>
                <p className="text-sm text-muted-foreground">
                  AI extracts vocabulary and grammar into cards with pinyin.
                </p>
              </button>
              <button
                type="button"
                onClick={() => choose("/courses")}
                className="text-left rounded-lg border-2 p-4 hover:bg-muted transition-colors"
              >
                <GraduationCap className="h-6 w-6 text-primary mb-2" />
                <p className="font-semibold">Start a course</p>
                <p className="text-sm text-muted-foreground">
                  Follow a structured track from HSK 1 upward.
                </p>
              </button>
            </div>
          ) : (
            step.content
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {isLastStep ? (
              <Button variant="ghost" onClick={onComplete}>
                Skip for now
              </Button>
            ) : (
              <Button onClick={() => setCurrentStep((s) => s + 1)}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
