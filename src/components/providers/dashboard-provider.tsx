"use client"

import { useEffect, useState } from "react"
import { FeedbackButton } from "@/components/feedback/feedback-button"
import { WelcomeModal } from "@/components/welcome/welcome-modal"
import { WhatsNewModal } from "@/components/changelog/whats-new-modal"
import type { Changelog } from "@/types/api-responses"

interface DashboardProviderProps {
  children: React.ReactNode
  hasSeenWelcome: boolean
}

export function DashboardProvider({ children, hasSeenWelcome }: DashboardProviderProps) {
  const [showWelcome, setShowWelcome] = useState(false)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const [changelog, setChangelog] = useState<Changelog | null>(null)

  useEffect(() => {
    // Show welcome modal only if user hasn't seen it
    if (!hasSeenWelcome) {
      setShowWelcome(true)
    } else {
      // Only check for new version if user has seen welcome
      checkForNewVersion()
    }
  }, [hasSeenWelcome])

  const checkForNewVersion = async () => {
    try {
      const response = await fetch("/api/changelog")
      const data = await response.json()

      if (data.changelog) {
        setChangelog(data.changelog)
        setShowWhatsNew(true)
      }
    } catch (error) {
      console.error("Failed to check for new version:", error)
    }
  }

  const handleWelcomeComplete = async () => {
    setShowWelcome(false)

    // Mark welcome as seen
    try {
      await fetch("/api/user/welcome", {
        method: "POST"
      })

      // After welcome, check for version updates
      checkForNewVersion()
    } catch (error) {
      console.error("Failed to update welcome status:", error)
    }
  }

  const handleWhatsNewComplete = async () => {
    setShowWhatsNew(false)

    // Mark version as seen
    try {
      await fetch("/api/user/version", {
        method: "POST"
      })
    } catch (error) {
      console.error("Failed to update version:", error)
    }
  }

  return (
    <>
      {children}
      <FeedbackButton />
      <WelcomeModal open={showWelcome} onComplete={handleWelcomeComplete} />
      <WhatsNewModal
        open={showWhatsNew}
        changelog={changelog}
        onComplete={handleWhatsNewComplete}
      />
    </>
  )
}
