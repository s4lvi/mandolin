"use client"

import { useEffect, useState } from "react"
import { FeedbackButton } from "@/components/feedback/feedback-button"
import { WelcomeModal } from "@/components/welcome/welcome-modal"

interface DashboardProviderProps {
  children: React.ReactNode
  hasSeenWelcome: boolean
}

export function DashboardProvider({ children, hasSeenWelcome }: DashboardProviderProps) {
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    // Show welcome modal only if user hasn't seen it
    if (!hasSeenWelcome) {
      setShowWelcome(true)
    }
  }, [hasSeenWelcome])

  const handleWelcomeComplete = async () => {
    setShowWelcome(false)

    // Mark welcome as seen
    try {
      await fetch("/api/user/welcome", {
        method: "POST"
      })
    } catch (error) {
      console.error("Failed to update welcome status:", error)
    }
  }

  return (
    <>
      {children}
      <FeedbackButton />
      <WelcomeModal open={showWelcome} onComplete={handleWelcomeComplete} />
    </>
  )
}
