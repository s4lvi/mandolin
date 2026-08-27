"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Volume2 } from "lucide-react"
import { useSpeak } from "@/hooks/use-speak"
import type { StoryDisplayMode, Card } from "@/types"
import type { StorySentence } from "@/hooks/use-stories"
import { buildWordIndex, tokenizeSentence, type StoryWordInfo } from "./story-words"

interface SentenceDisplayProps {
  sentence: StorySentence
  displayMode: StoryDisplayMode
  cards: Card[] | undefined
  onWordTap: (word: StoryWordInfo) => void
}

export function SentenceDisplay({ sentence, displayMode, cards, onWordTap }: SentenceDisplayProps) {
  // Pinyin visibility derives from the display mode; a per-sentence "reveal"
  // override is cleared whenever the mode changes.
  const [pinyinRevealed, setPinyinRevealed] = useState(false)
  const [lastMode, setLastMode] = useState(displayMode)
  if (lastMode !== displayMode) {
    setLastMode(displayMode)
    setPinyinRevealed(false)
  }
  const showPinyin = displayMode === "hanzi_pinyin_audio" || pinyinRevealed
  const [showEnglish, setShowEnglish] = useState(false)
  const { speak, isPlaying } = useSpeak()

  const tokens = useMemo(
    () => tokenizeSentence(sentence.hanzi, buildWordIndex(cards, sentence)),
    [cards, sentence]
  )

  const playAudio = () => {
    if (isPlaying) return
    void speak(sentence.hanzi)
  }

  return (
    <div className="group py-3 px-3 md:px-4 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 mt-0.5"
          onClick={playAudio}
          disabled={isPlaying}
          aria-label="Play pronunciation"
        >
          <Volume2 className={`h-5 w-5 ${isPlaying ? "animate-pulse text-primary" : ""}`} />
        </Button>

        <div className="flex-1 min-w-0">
          {/* Hanzi — 22-24px for readability; known words are tappable */}
          <p className="text-[22px] md:text-2xl leading-relaxed break-words">
            {tokens.map((token, i) =>
              token.kind === "word" ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => onWordTap(token.info)}
                  className={`rounded px-0.5 -mx-0.5 underline decoration-dotted underline-offset-4 hover:bg-primary/10 active:bg-primary/20 ${
                    token.info.card ? "decoration-primary/40" : "decoration-amber-500/70"
                  }`}
                >
                  {token.text}
                </button>
              ) : (
                <span key={i}>{token.text}</span>
              )
            )}
          </p>

          {/* Reveal buttons — pill-shaped for easy tapping */}
          <div className="flex flex-wrap gap-2 mt-2">
            {showPinyin ? (
              <p className="text-sm text-muted-foreground break-words">{sentence.pinyin}</p>
            ) : (
              <button
                className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary/70 hover:bg-primary/10 active:bg-primary/20 min-h-[32px]"
                onClick={() => setPinyinRevealed(true)}
              >
                pinyin
              </button>
            )}

            {showEnglish ? (
              <p className="text-sm text-blue-600 dark:text-blue-400 break-words">{sentence.english}</p>
            ) : (
              <button
                className="text-xs px-3 py-1.5 rounded-full border border-blue-500/30 text-blue-500/70 hover:bg-blue-500/10 active:bg-blue-500/20 min-h-[32px]"
                onClick={() => setShowEnglish(true)}
              >
                english
              </button>
            )}
          </div>

          {/* New words indicator */}
          {sentence.newWords && sentence.newWords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {sentence.newWords.map((word) => (
                <Badge key={word} variant="secondary" className="text-xs">
                  new: {word}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
