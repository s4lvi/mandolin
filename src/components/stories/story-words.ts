import type { Card } from "@/types"
import type { StorySentence, StoryWordDetail } from "@/hooks/use-stories"

export interface StoryWordInfo extends StoryWordDetail {
  /** Deck card matching this hanzi, when the word is already in the deck. */
  card?: Card
}

export type SentenceToken =
  | { kind: "text"; text: string }
  | { kind: "word"; text: string; info: StoryWordInfo }

/** Builds a hanzi → word-info map from the deck plus a sentence's new-word glosses. */
export function buildWordIndex(cards: Card[] | undefined, sentence: StorySentence): Map<string, StoryWordInfo> {
  const index = new Map<string, StoryWordInfo>()
  for (const detail of sentence.newWordDetails ?? []) {
    if (detail.hanzi) index.set(detail.hanzi, { ...detail })
  }
  for (const card of cards ?? []) {
    if (!card.hanzi) continue
    index.set(card.hanzi, { hanzi: card.hanzi, pinyin: card.pinyin, english: card.english, card })
  }
  return index
}

/**
 * Splits a sentence into tappable known words and plain text using greedy
 * longest-match against the word index. Only words with data become tokens.
 */
export function tokenizeSentence(hanzi: string, index: Map<string, StoryWordInfo>): SentenceToken[] {
  const tokens: SentenceToken[] = []
  if (index.size === 0) return [{ kind: "text", text: hanzi }]

  const maxLen = Math.max(...Array.from(index.keys(), (k) => k.length))
  const chars = Array.from(hanzi)
  let plain = ""
  let i = 0

  while (i < chars.length) {
    let matched: StoryWordInfo | undefined
    let matchedLen = 0
    for (let len = Math.min(maxLen, chars.length - i); len > 0; len--) {
      const candidate = chars.slice(i, i + len).join("")
      const info = index.get(candidate)
      if (info) {
        matched = info
        matchedLen = len
        break
      }
    }
    if (matched) {
      if (plain) {
        tokens.push({ kind: "text", text: plain })
        plain = ""
      }
      tokens.push({ kind: "word", text: matched.hanzi, info: matched })
      i += matchedLen
    } else {
      plain += chars[i]
      i++
    }
  }
  if (plain) tokens.push({ kind: "text", text: plain })
  return tokens
}
