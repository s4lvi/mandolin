/**
 * Speech synthesis utility.
 *
 * Plays Mandarin audio from Azure Neural TTS (high quality, consistent across
 * devices) via the `/api/tts` route, and falls back to the browser Web Speech
 * API when Azure isn't configured or a request fails. The audio response is
 * cached (immutable HTTP headers), so repeated plays of the same word are free
 * and instant.
 */

let voicesLoaded = false
let chineseVoice: SpeechSynthesisVoice | null = null
let voicesPromise: Promise<void> | null = null

// Module-level playback state
let currentAudio: HTMLAudioElement | null = null
// Per-element flag: set when we tear an element down so its event handlers
// (which may still fire during pause()/load()) never trigger a fallback.
const cancelledAudio = new WeakSet<HTMLAudioElement>()
// true = optimistic, set false only when the route reports it's unconfigured/unauthorized
let azureEnabled = true

function stopCurrent(): void {
  if (currentAudio) {
    const audio = currentAudio
    currentAudio = null
    cancelledAudio.add(audio)
    // Detach handlers BEFORE tearing down so the old text never falls back to Web Speech.
    audio.onplay = null
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.src = ""
    audio.load()
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Attempt Azure TTS playback. Returns true if playback was initiated within the
 * current user gesture (important for iOS autoplay). Internally falls back to
 * Web Speech if the audio errors before it starts.
 */
function tryAzure(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): boolean {
  if (!azureEnabled || typeof window === "undefined") return false

  const url = `/api/tts?text=${encodeURIComponent(text)}`
  const audio = new Audio(url)
  currentAudio = audio
  let started = false
  // Only one of onerror / play().catch may fall back or finish this attempt.
  let handled = false

  const probeAzure = () => {
    fetch(url, { method: "HEAD" })
      .then((r) => {
        if (r.status === 503 || r.status === 401) azureEnabled = false
      })
      .catch(() => {})
  }

  const fail = () => {
    if (handled || cancelledAudio.has(audio)) return
    handled = true
    if (currentAudio === audio) currentAudio = null
    probeAzure()
    if (started) {
      onEnd?.() // it played then died — don't double-play
    } else {
      void speakWithWebSpeech(text, onStart, onEnd, onError)
    }
  }

  audio.onplay = () => {
    if (cancelledAudio.has(audio)) return
    started = true
    onStart?.()
  }
  audio.onended = () => {
    if (cancelledAudio.has(audio) || handled) return
    handled = true
    if (currentAudio === audio) currentAudio = null
    onEnd?.()
  }
  audio.onerror = fail

  // play() must be called synchronously within the gesture for iOS
  audio.play().catch(fail)

  return true
}

/** Load voices and pick the best Chinese voice (iOS Safari needs explicit loading). */
function loadVoices(): Promise<void> {
  if (voicesLoaded && chineseVoice) return Promise.resolve()
  if (voicesPromise) return voicesPromise

  voicesPromise = new Promise<void>((resolve) => {
    const pickVoice = (list: SpeechSynthesisVoice[]) =>
      list.find((v) => v.lang === "zh-CN") ||
      list.find((v) => v.lang.startsWith("zh")) ||
      list.find((v) => v.lang === "cmn-CN") ||
      null

    const synth = window.speechSynthesis
    const voices = synth.getVoices()
    if (voices.length > 0) {
      chineseVoice = pickVoice(voices)
      voicesLoaded = true
      resolve()
      return
    }

    let timer: ReturnType<typeof setTimeout> | null = null
    const handler = () => {
      if (timer) clearTimeout(timer)
      chineseVoice = pickVoice(synth.getVoices())
      voicesLoaded = true
      resolve()
    }
    synth.addEventListener("voiceschanged", handler, { once: true })
    timer = setTimeout(() => {
      synth.removeEventListener("voiceschanged", handler)
      if (!voicesLoaded) {
        voicesLoaded = true
        resolve()
      }
    }, 1000)
  }).finally(() => {
    voicesPromise = null
  })

  return voicesPromise
}

/** Browser Web Speech fallback (iOS Safari compatible). */
async function speakWithWebSpeech(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): Promise<void> {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onError?.()
      return
    }

    await loadVoices()
    window.speechSynthesis.cancel()
    await new Promise((resolve) => setTimeout(resolve, 50))

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "zh-CN"
    utterance.rate = 0.8 // Slower for learning
    if (chineseVoice) utterance.voice = chineseVoice

    utterance.onstart = () => onStart?.()
    utterance.onend = () => onEnd?.()
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event)
      onError?.()
    }

    window.speechSynthesis.speak(utterance)
    if (window.speechSynthesis.paused) window.speechSynthesis.resume()
  } catch (error) {
    console.error("Error speaking Chinese:", error)
    onError?.()
  }
}

/**
 * Speak Chinese text — Azure TTS with a Web Speech fallback.
 */
export async function speakChinese(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): Promise<void> {
  stopCurrent()
  // Azure first (initiated synchronously for iOS); falls back internally on failure.
  if (tryAzure(text, onStart, onEnd, onError)) return
  await speakWithWebSpeech(text, onStart, onEnd, onError)
}

/** Check if any speech output is available. */
export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

/** Preload Web Speech voices on mount (call in a useEffect). */
export function preloadVoices(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    loadVoices()
  }
}
