"use client"

import { useEffect, useRef, useState } from "react"
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
  const welcomeMarked = useRef(false)

  useEffect(() => {
    // If the welcome tour was shown on this mount, defer What's New to the next load
    // so a brand-new user never gets two modals back to back.
    if (!hasSeenWelcome) return
    fetchNewChangelog().then((newChangelog) => {
      if (newChangelog) {
        setChangelog(newChangelog)
        setShowWhatsNew(true)
      }
    })
  }, [hasSeenWelcome])

  const handleWelcomeComplete = async () => {
    setShowWelcome(false)
    // The modal can fire this from both a choice button and onOpenChange; mark once.
    if (welcomeMarked.current) return
    welcomeMarked.current = true

    try {
      await fetch("/api/user/welcome", { method: "POST" })
    } catch (error) {
      console.error("Failed to update welcome status:", error)
    }
  }

  const handleWhatsNewComplete = async () => {
    setShowWhatsNew(false)

    // Mark version as seen
    try {
      await fetch("/api/user/version", { method: "POST" })
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
