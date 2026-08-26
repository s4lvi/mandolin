"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { speakChinese } from "@/lib/speech"

/**
 * Wraps `speakChinese` with an `isPlaying` flag that tracks playback via the
 * onStart/onEnd/onError callbacks and is never updated after unmount.
 */
export function useSpeak() {
  const [isPlaying, setIsPlaying] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const speak = useCallback(async (text: string) => {
    if (!text) return
    const stop = () => {
      if (mountedRef.current) setIsPlaying(false)
    }
    if (mountedRef.current) setIsPlaying(true)
    try {
      await speakChinese(text, undefined, stop, stop)
    } catch {
      stop()
    }
  }, [])

  return { speak, isPlaying }
}
