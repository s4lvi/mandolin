"use client"

import { useRef, useCallback, useState } from "react"

interface SwipeState {
  deltaX: number
  deltaY: number
  direction: "left" | "right" | null
  isSwiping: boolean
}

interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number  // Minimum px to trigger swipe (default 80)
  edgeDeadZone?: number  // Ignore swipes starting within this many px of screen edge (default 20)
  enabled?: boolean
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  edgeDeadZone = 20,
  enabled = true
}: UseSwipeOptions) {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    deltaX: 0,
    deltaY: 0,
    direction: null,
    isSwiping: false
  })

  const startX = useRef(0)
  const startY = useRef(0)
  const isTracking = useRef(false)
  const committed = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return

    const touch = e.touches[0]
    // Dead zone: ignore touches near screen edges (iOS back gesture)
    if (touch.clientX < edgeDeadZone || touch.clientX > window.innerWidth - edgeDeadZone) {
      return
    }

    startX.current = touch.clientX
    startY.current = touch.clientY
    isTracking.current = true
    committed.current = false
    setSwipeState({ deltaX: 0, deltaY: 0, direction: null, isSwiping: false })
  }, [enabled, edgeDeadZone])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTracking.current || !enabled) return

    const touch = e.touches[0]
    const dX = touch.clientX - startX.current
    const dY = touch.clientY - startY.current

    // Only commit to horizontal swipe if horizontal > 2x vertical
    if (!committed.current) {
      if (Math.abs(dX) > 15 && Math.abs(dX) > Math.abs(dY) * 2) {
        committed.current = true
      } else if (Math.abs(dY) > 15) {
        // Vertical scroll — stop tracking
        isTracking.current = false
        setSwipeState({ deltaX: 0, deltaY: 0, direction: null, isSwiping: false })
        return
      } else {
        return // Not enough movement to decide yet
      }
    }

    const direction = dX < 0 ? "left" : "right"
    setSwipeState({ deltaX: dX, deltaY: dY, direction, isSwiping: true })
  }, [enabled])

  const handleTouchEnd = useCallback(() => {
    if (!isTracking.current || !enabled) return
    isTracking.current = false

    const { deltaX, direction } = swipeState

    if (Math.abs(deltaX) >= threshold && direction) {
      if (direction === "left" && onSwipeLeft) {
        onSwipeLeft()
      } else if (direction === "right" && onSwipeRight) {
        onSwipeRight()
      }
    }

    setSwipeState({ deltaX: 0, deltaY: 0, direction: null, isSwiping: false })
  }, [enabled, swipeState, threshold, onSwipeLeft, onSwipeRight])

  const swipeHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }

  // CSS transform style based on current swipe position
  const swipeStyle: React.CSSProperties = swipeState.isSwiping
    ? {
        transform: `translateX(${swipeState.deltaX * 0.5}px) rotate(${swipeState.deltaX * 0.03}deg)`,
        transition: "none"
      }
    : {
        transform: "translateX(0) rotate(0)",
        transition: "transform 0.2s ease-out"
      }

  // Overlay color based on swipe direction
  const swipeOverlay = swipeState.isSwiping && Math.abs(swipeState.deltaX) > 30
    ? swipeState.direction === "left"
      ? `rgba(239, 68, 68, ${Math.min(Math.abs(swipeState.deltaX) / threshold * 0.15, 0.15)})` // red
      : `rgba(34, 197, 94, ${Math.min(Math.abs(swipeState.deltaX) / threshold * 0.15, 0.15)})` // green
    : "transparent"

  return {
    swipeHandlers,
    swipeStyle,
    swipeOverlay,
    swipeState
  }
}
