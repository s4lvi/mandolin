"use client"

import { useState } from "react"
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
  Sparkles,
  RotateCcw,
  TrendingUp,
  Zap,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Check
} from "lucide-react"

interface WelcomeModalProps {
  open: boolean
  onComplete: () => void
}

const steps = [
  {
    title: "Welcome to Mandolin! 🎉",
    description: "Your AI-powered Mandarin learning companion",
    content: (
      <div className="space-y-4 text-center">
        <div className="text-6xl mb-4">🎵</div>
        <p className="text-lg">
          Master Mandarin Chinese with spaced repetition, AI-powered flashcards, and gamification.
        </p>
        <p className="text-muted-foreground">
          Let's take a quick tour of the key features
        </p>
      </div>
    )
  },
  {
    title: "Upload Your Notes",
    description: "AI extracts flashcards automatically",
    icon: Upload,
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="bg-primary text-primary-foreground p-3 rounded-full">
            <Upload className="h-6 w-6" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-semibold mb-1">Smart Note Parsing</h4>
            <p className="text-sm text-muted-foreground">
              Paste your lesson notes and our AI automatically extracts vocabulary, grammar patterns,
              and phrases with pinyin and English translations.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="bg-purple-500 text-white p-3 rounded-full">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-semibold mb-1">AI Auto-fill</h4>
            <p className="text-sm text-muted-foreground">
              When creating cards manually, AI can help fill in missing fields like pinyin,
              English translations, or usage notes.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Smart Review System",
    description: "Spaced repetition that adapts to you",
    icon: RotateCcw,
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="bg-blue-500 text-white p-3 rounded-full">
            <RotateCcw className="h-6 w-6" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-semibold mb-1">SM-2 Algorithm</h4>
            <p className="text-sm text-muted-foreground">
              Cards are shown at optimal intervals based on how well you know them.
              Review due cards daily to maximize retention.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="bg-green-500 text-white p-3 rounded-full">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-semibold mb-1">Filter & Focus</h4>
            <p className="text-sm text-muted-foreground">
              Review by card type (vocabulary, grammar, phrases) or filter by tags
              like HSK level, topics, or parts of speech.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Level Up Your Skills",
    description: "Gamification keeps you motivated",
    icon: Trophy,
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="bg-yellow-500 text-white p-3 rounded-full">
            <Zap className="h-6 w-6" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-semibold mb-1">Earn XP & Level Up</h4>
            <p className="text-sm text-muted-foreground">
              Gain experience points with each review. Rate cards as Again, Hard, Good,
              or Easy to earn varying amounts of XP.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="bg-orange-500 text-white p-3 rounded-full">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="text-left flex-1">
            <h4 className="font-semibold mb-1">Achievements & Streaks</h4>
            <p className="text-sm text-muted-foreground">
              Unlock achievements for milestones and maintain daily streaks to
              build consistent study habits.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Ready to Start?",
    description: "Here's how to get going",
    icon: Check,
    content: (
      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-lg space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div className="text-left">
              <p className="font-medium">Upload your first lesson notes</p>
              <p className="text-sm text-muted-foreground">
                Go to Upload → paste your notes → let AI create cards
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div className="text-left">
              <p className="font-medium">Review and organize your deck</p>
              <p className="text-sm text-muted-foreground">
                Check your Deck → edit cards if needed → organize with tags
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div className="text-left">
              <p className="font-medium">Start your first review session</p>
              <p className="text-sm text-muted-foreground">
                Go to Review → configure settings → start learning!
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Need help? Use the feedback button to report issues or request features
        </p>
      </div>
    )
  }
]

export function WelcomeModal({ open, onComplete }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step.icon && <step.icon className="h-5 w-5" />}
            {step.title}
          </DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step.content}
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
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
            <Button onClick={handleNext}>
              {isLastStep ? (
                <>
                  Get Started
                  <Check className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
