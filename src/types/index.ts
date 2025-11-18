export type CardType = "VOCABULARY" | "GRAMMAR" | "PHRASE" | "IDIOM"

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
  lessonId?: string
  deckId: string
  createdAt: string
  updatedAt: string
  correctCount: number
  incorrectCount: number
  lastReviewed?: string
  nextReview?: string
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
