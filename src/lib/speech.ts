/**
 * iOS-compatible speech synthesis utility
 * Handles iOS Safari quirks with Web Speech API
 */

let voicesLoaded = false
let chineseVoice: SpeechSynthesisVoice | null = null

/**
 * Initialize voices and find the best Chinese voice
 * iOS Safari requires explicit voice loading
 */
function loadVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (voicesLoaded && chineseVoice) {
      resolve()
      return
    }

    const voices = window.speechSynthesis.getVoices()

    if (voices.length > 0) {
      // Find the best Chinese voice
      chineseVoice =
        voices.find(v => v.lang === 'zh-CN') ||
        voices.find(v => v.lang.startsWith('zh')) ||
        voices.find(v => v.lang === 'cmn-CN') || // Mandarin Chinese
        null

      voicesLoaded = true
      resolve()
    } else {
      // Voices not loaded yet, wait for the event
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices()
        chineseVoice =
          updatedVoices.find(v => v.lang === 'zh-CN') ||
          updatedVoices.find(v => v.lang.startsWith('zh')) ||
          updatedVoices.find(v => v.lang === 'cmn-CN') ||
          null

        voicesLoaded = true
        resolve()
      }

      // Fallback timeout
      setTimeout(() => {
        if (!voicesLoaded) {
          voicesLoaded = true
          resolve()
        }
      }, 1000)
    }
  })
}

/**
 * Speak Chinese text with iOS Safari compatibility
 * @param text - The Chinese text to speak
 * @param onStart - Callback when speech starts
 * @param onEnd - Callback when speech ends
 * @param onError - Callback when an error occurs
 */
export async function speakChinese(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): Promise<void> {
  try {
    // Ensure voices are loaded
    await loadVoices()

    // Cancel any ongoing speech (important for iOS)
    window.speechSynthesis.cancel()

    // Small delay to ensure cancellation completes on iOS
    await new Promise(resolve => setTimeout(resolve, 50))

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.8 // Slower for learning

    // Use the Chinese voice if available
    if (chineseVoice) {
      utterance.voice = chineseVoice
    }

    utterance.onstart = () => {
      onStart?.()
    }

    utterance.onend = () => {
      onEnd?.()
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      onError?.()
    }

    // Speak the utterance
    window.speechSynthesis.speak(utterance)

    // iOS Safari sometimes needs a resume call
    // This is a known workaround for iOS
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }

  } catch (error) {
    console.error('Error speaking Chinese:', error)
    onError?.()
  }
}

/**
 * Check if speech synthesis is supported
 */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Preload voices on component mount
 * Call this in a useEffect to ensure voices are ready
 */
export function preloadVoices(): void {
  if (isSpeechSupported()) {
    loadVoices()
  }
}
