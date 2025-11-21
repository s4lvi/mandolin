/**
 * Tag categorization for flashcard organization
 * Organizes PREDEFINED_TAGS into logical categories for UI display
 */

import { PREDEFINED_TAGS, type PredefinedTag } from "../constants"

/**
 * Tag categories for organized display in forms and filters
 */
export const TAG_CATEGORIES = {
  HSK: [
    "HSK-1",
    "HSK-2",
    "HSK-3",
    "HSK-4",
    "HSK-5",
    "HSK-6"
  ] as const,

  PARTS_OF_SPEECH: [
    "noun",
    "verb",
    "adjective",
    "adverb",
    "conjunction",
    "preposition",
    "particle",
    "measure-word",
    "pronoun"
  ] as const,

  TOPICS: [
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
    "nature"
  ] as const,

  USAGE: [
    "formal",
    "informal",
    "spoken",
    "written",
    "polite",
    "casual"
  ] as const,

  OTHER: [
    "common",
    "essential",
    "advanced"
  ] as const
} as const

/**
 * Friendly display names for tag categories
 */
export const TAG_CATEGORY_LABELS: Record<keyof typeof TAG_CATEGORIES, string> = {
  HSK: "HSK Levels",
  PARTS_OF_SPEECH: "Parts of Speech",
  TOPICS: "Topics",
  USAGE: "Usage Context",
  OTHER: "Other"
}

/**
 * Get all tags in a specific category
 */
export function getTagsByCategory(category: keyof typeof TAG_CATEGORIES): readonly string[] {
  return TAG_CATEGORIES[category]
}

/**
 * Get the category for a specific tag
 */
export function getTagCategory(tag: PredefinedTag): keyof typeof TAG_CATEGORIES | null {
  for (const [category, tags] of Object.entries(TAG_CATEGORIES)) {
    if ((tags as readonly string[]).includes(tag)) {
      return category as keyof typeof TAG_CATEGORIES
    }
  }
  return null
}

/**
 * Validate that a tag exists in PREDEFINED_TAGS
 */
export function isValidTag(tag: string): tag is PredefinedTag {
  return PREDEFINED_TAGS.includes(tag as PredefinedTag)
}
