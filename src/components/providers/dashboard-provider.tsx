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

// Fetch the changelog entry for a version the user hasn't seen yet (null if none)
async function fetchNewChangelog(): Promise<Changelog | null> {
  try {
    const response = await fetch("/api/changelog")
    const data = await response.json()
    return data.changelog ?? null
  } catch (error) {
    console.error("Failed to check for new version:", error)
    return null
  }
}

export function DashboardProvider({ children, hasSeenWelcome }: DashboardProviderProps) {
  // Show welcome modal only if user hasn't seen it (derived at mount instead of via an effect)
  const [showWelcome, setShowWelcome] = useState(!hasSeenWelcome)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const [changelog, setChangelog] = useState<Changelog | null>(null)

  const showChangelog = (newChangelog: Changelog | null) => {
    if (newChangelog) {
      setChangelog(newChangelog)
      setShowWhatsNew(true)
    }
  }

  useEffect(() => {
    // Only check for new version if user has seen welcome
    if (!hasSeenWelcome) return
    fetchNewChangelog().then(showChangelog)
  }, [hasSeenWelcome])

  const handleWelcomeComplete = async () => {
    setShowWelcome(false)

    // Mark welcome as seen
    try {
      await fetch("/api/user/welcome", {
        method: "POST"
      })

      // After welcome, check for version updates
      showChangelog(await fetchNewChangelog())
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
