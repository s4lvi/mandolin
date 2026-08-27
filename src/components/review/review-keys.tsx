"use client"

import { useEffect } from "react"
import { Quality } from "@/lib/srs"

interface ReviewKeysOptions {
  /** Disable all shortcuts (e.g. while a submission is pending) */
  enabled?: boolean
  /** Whether the answer is currently visible */
  revealed: boolean
  /** Space / Enter before the answer is revealed */
  onReveal?: () => void
  /** Enter after the answer is revealed (e.g. advance or default-rate) */
  onEnterRevealed?: () => void
  /** 1–4 after the answer is revealed */
  onRate?: (quality: Quality) => void
}

const KEY_TO_QUALITY: Record<string, Quality> = {
  "1": Quality.AGAIN,
  "2": Quality.HARD,
  "3": Quality.GOOD,
  "4": Quality.EASY
}

/** True when the keystroke belongs to a form control and must not be hijacked */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || typeof el.tagName !== "string") return false
  const tag = el.tagName.toLowerCase()
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    tag === "button" ||
    tag === "a" ||
    el.isContentEditable
  )
}

/**
 * Keyboard shortcuts shared by every review mode:
 * Space / Enter reveals, 1–4 rates Again/Hard/Good/Easy once revealed.
 */
export function useReviewKeys({
  enabled = true,
  revealed,
  onReveal,
  onEnterRevealed,
  onRate
}: ReviewKeysOptions) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      if (isEditableTarget(e.target)) return

      if (e.key === " " || e.key === "Enter") {
        if (!revealed) {
          if (onReveal) {
            e.preventDefault()
            onReveal()
          }
        } else if (onEnterRevealed && e.key === "Enter") {
          e.preventDefault()
          onEnterRevealed()
        } else if (e.key === " ") {
          e.preventDefault()
        }
        return
      }

      if (revealed && onRate && e.key in KEY_TO_QUALITY) {
        e.preventDefault()
        onRate(KEY_TO_QUALITY[e.key])
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [enabled, revealed, onReveal, onEnterRevealed, onRate])
}

/** Small desktop-only hint row for the rating shortcuts */
export function KeyHint({ showHard = true }: { showHard?: boolean }) {
  const keys = showHard ? ["1", "2", "3", "4"] : ["1", "3", "4"]
  return (
    <p className="hidden md:flex items-center justify-center gap-1 text-[11px] text-muted-foreground mt-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px] leading-none"
        >
          {k}
        </kbd>
      ))}
      <span className="ml-1">to rate</span>
    </p>
  )
}

/** "New" badge shown on the front of never-reviewed cards */
export function NewBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      New
    </span>
  )
}
