"use client"

import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ReviewActionBarProps {
  selected: number
  total: number
  /** Duplicates that will be linked to the lesson (0 hides the suffix) */
  linkCount?: number
  isSaving: boolean
  /** Cards are still streaming in from the parser */
  isParsing: boolean
  onSelectAll: () => void
  onSelectNone: () => void
  onSave: () => void
}

/**
 * Sticky save controls for the review list: pinned to the top on desktop and
 * to the bottom (just above the tab bar) on mobile, so a long list never
 * requires scrolling to the end to save.
 */
export function ReviewActionBar({
  selected,
  total,
  linkCount = 0,
  isSaving,
  isParsing,
  onSelectAll,
  onSelectNone,
  onSave
}: ReviewActionBarProps) {
  const saveLabel = isSaving
    ? `Saving ${selected} card${selected !== 1 ? "s" : ""}…`
    : `Save ${selected} card${selected !== 1 ? "s" : ""}${linkCount > 0 ? ` + link ${linkCount}` : ""}`

  return (
    <div
      role="toolbar"
      aria-label="Review actions"
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t bg-background/95 backdrop-blur-md px-3 py-2 lg:sticky lg:top-16 lg:bottom-auto lg:inset-x-auto lg:border lg:rounded-lg lg:px-4 lg:py-3 lg:shadow-sm"
    >
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {selected} of {total} selected
          </p>
          <div className="flex gap-3 text-xs">
            <button
              type="button"
              className="text-primary hover:underline disabled:opacity-50"
              onClick={onSelectAll}
              disabled={isSaving || selected === total}
            >
              Select all
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:underline disabled:opacity-50"
              onClick={onSelectNone}
              disabled={isSaving || selected === 0}
            >
              Select none
            </button>
          </div>
        </div>
        <Button
          onClick={onSave}
          disabled={isSaving || isParsing || selected === 0}
          className="shrink-0"
        >
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}
