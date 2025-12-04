export type CardType = "VOCABULARY" | "GRAMMAR" | "PHRASE" | "IDIOM"

export type CardState = "NEW" | "LEARNING" | "REVIEW" | "LEARNED"

export interface Tag {
  id: string
  name: string
  category?: string
}

export interface CardTag {
  cardId: string
  tagId: string
  tag: Tag
}

export interface Lesson {
  id: string
  number: number
  title?: string
  date?: string
  notes?: string
  deckId: string
  createdAt: string
  _count?: {
    cards: number
  }
}

export interface Card {
  id: string
  hanzi: string
  pinyin: string
  english: string
  notes?: string
  type: CardType
  isPriority: boolean
  lessonId?: string
  deckId: string
  createdAt: string
  updatedAt: string
  correctCount: number
  incorrectCount: number
  lastReviewed?: string
  nextReview?: string
  // SM-2 algorithm fields
  easeFactor: number
  interval: number
  repetitions: number
  state: CardState
  lesson?: {
    number: number
    title?: string
  }
  tags: CardTag[]
}

export interface ParsedCard {
  hanzi: string
  pinyin: string
  english: string
  notes?: string
  type: CardType
  suggestedTags: string[]
}

export interface ExampleSentence {
  sentence: string
  pinyin: string
  translation: string
}

export type FaceMode = "pinyin" | "hanzi" | "both" | "english" | "random"

export type TestDirection = "HANZI_TO_MEANING" | "MEANING_TO_HANZI" | "PINYIN_TO_HANZI"

export type ReviewMode = "classic" | "test_easy" | "narrative"
