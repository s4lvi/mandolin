// Predefined tags for categorizing flashcards
export const PREDEFINED_TAGS = [
  // HSK Levels
  "HSK-1",
  "HSK-2",
  "HSK-3",
  "HSK-4",
  "HSK-5",
  "HSK-6",

  // Parts of Speech
  "noun",
  "verb",
  "adjective",
  "adverb",
  "conjunction",
  "preposition",
  "particle",
  "measure-word",
  "pronoun",

  // Topics
  "food",
  "travel",
  "business",
  "family",
  "health",
  "weather",
  "time",
  "numbers",
  "colors",
  "animals",
  "clothing",
  "home",
  "school",
  "work",
  "shopping",
  "transportation",
  "sports",
  "emotions",
  "body",
  "nature",

  // Usage
  "formal",
  "informal",
  "spoken",
  "written",
  "polite",
  "casual",

  // Other
  "common",
  "essential",
  "advanced"
] as const

export type PredefinedTag = typeof PREDEFINED_TAGS[number]
