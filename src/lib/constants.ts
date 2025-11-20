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

// AI Prompts - centralized for consistency
export const PARSE_NOTES_PROMPT = `You are a Mandarin Chinese language learning assistant.
Parse the following lesson notes into structured flashcard data.

For each vocabulary word, phrase, idiom, or grammar point, extract:
- hanzi: Chinese characters
- pinyin: Romanization with tone marks (e.g., nǐ hǎo, not ni3 hao3)
- english: English translation/meaning
- notes: Any additional context or usage notes from the lesson
- type: One of VOCABULARY, GRAMMAR, PHRASE, or IDIOM
- suggestedTags: 2-4 tags from the allowed list below

ALLOWED TAGS (only use these exact tags):
${PREDEFINED_TAGS.join(", ")}

Rules:
1. ALWAYS use tone marks in pinyin (ā, á, ǎ, à, ē, é, ě, è, ī, í, ǐ, ì, ō, ó, ǒ, ò, ū, ú, ǔ, ù, ǖ, ǘ, ǚ, ǜ), never tone numbers
2. For grammar points, include the pattern/structure in the hanzi field
3. Be thorough - extract ALL vocabulary and grammar points mentioned
4. Provide clear, concise English definitions
5. Add helpful usage notes where relevant
6. For grammar patterns, explain when/how to use them in the notes
7. ONLY use tags from the allowed list above - do not create new tags
8. IMPORTANT: Prefer VOCABULARY over PHRASE. Only use PHRASE for very common fixed expressions (greetings, farewells, idiom-like phrases). Most 2-3 character combinations should be VOCABULARY. If it's primarily teaching a word's meaning, use VOCABULARY even if shown in a short phrase context.

Respond with ONLY a valid JSON array of cards, no other text. Example format:
[
  {
    "hanzi": "你好",
    "pinyin": "nǐ hǎo",
    "english": "hello",
    "notes": "Common greeting",
    "type": "PHRASE",
    "suggestedTags": ["greeting", "HSK-1"]
  }
]`

export const GENERATE_SENTENCE_PROMPT = `Generate a simple example sentence demonstrating this Mandarin grammar point or language pattern.

Grammar/Pattern: {grammarPoint}
Additional context: {context}

Requirements:
1. Use basic HSK 1-3 vocabulary where possible
2. Keep the sentence short (5-10 characters ideal, max 15)
3. Clearly demonstrate the grammar pattern
4. Make the context practical and everyday
5. Use tone marks in pinyin (ā, á, ǎ, à, etc.)

Respond with ONLY valid JSON, no other text:
{
  "sentence": "Chinese characters here",
  "pinyin": "pinyin with tone marks",
  "translation": "English translation"
}`
