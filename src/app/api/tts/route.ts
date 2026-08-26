import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { rateLimited, RATE_LIMITS } from "@/lib/rate-limit"

// Default Mandarin voice — clear, learner-friendly. Override via ?voice=.
const DEFAULT_VOICE = "zh-CN-YunyangNeural"
// Allow only well-formed Azure neural voice names (prevents SSML injection via the param).
const VOICE_PATTERN = /^[a-zA-Z]{2,3}-[a-zA-Z]{2,4}-[A-Za-z0-9]+Neural$/
const MAX_TEXT_LENGTH = 1000

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// HEAD /api/tts — cheap availability probe for the client: 200 when the user is
// signed in and Azure is configured, 401 / 503 otherwise. No body.
export async function HEAD() {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 })
  }
  if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
    return new NextResponse(null, { status: 503 })
  }
  return new NextResponse(null, { status: 200 })
}

// GET /api/tts?text=...&voice=...&rate=slow|normal
// Returns audio/mpeg from Azure Neural TTS. Falls through to a 503 when Azure
// isn't configured so the client can fall back to the browser Web Speech API.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = rateLimited(`tts:${session.user.id}`, RATE_LIMITS.TTS)
  if (limited) return limited

  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) {
    // Not configured — client should use its Web Speech fallback
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const text = (searchParams.get("text") || "").trim()
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 })
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "Text too long" }, { status: 413 })
  }

  const voiceParam = searchParams.get("voice")
  const voice = voiceParam && VOICE_PATTERN.test(voiceParam) ? voiceParam : DEFAULT_VOICE
  // Slightly slower by default — easier to follow while learning
  const rate = searchParams.get("rate") === "normal" ? "0%" : "-12%"

  const ssml =
    `<speak version="1.0" xml:lang="zh-CN">` +
    `<voice name="${voice}"><prosody rate="${rate}">${escapeXml(text)}</prosody></voice>` +
    `</speak>`

  try {
    const res = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          "User-Agent": "mangolin-tts"
        },
        body: ssml,
        signal: AbortSignal.timeout(10000)
      }
    )

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.error("Azure TTS error", res.status, detail.slice(0, 200))
      return NextResponse.json({ error: "TTS provider error" }, { status: 502 })
    }

    const audio = await res.arrayBuffer()
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        // Content-addressed by the query string — cache hard in the browser.
        // `private`: the route is authenticated, so shared caches must not store it.
        "Cache-Control": "private, max-age=31536000, immutable"
      }
    })
  } catch (error) {
    console.error("TTS request failed:", error)
    return NextResponse.json({ error: "TTS request failed" }, { status: 502 })
  }
}
