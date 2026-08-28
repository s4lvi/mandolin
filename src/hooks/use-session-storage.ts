"use client"

import { useEffect } from "react"

/**
 * Tiny sessionStorage helpers. Every call is wrapped in try/catch because the
 * accessor itself can throw (private mode, storage disabled, SSR).
 */

export function readSessionStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeSessionStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage unavailable; persistence is best-effort
  }
}

export function removeSessionStorage(key: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/** Warn before the tab closes / navigates away while `active` is true */
export function useBeforeUnloadGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Legacy browsers require returnValue to be set to show the prompt
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [active])
}
