// AI Model Configuration
export const CLAUDE_MODEL = "claude-sonnet-4-20250514"

// Interactive Lesson Configuration
export const LESSON_TOTAL_PAGES = 5

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

export const LESSON_CONTEXT_PROMPT = `You are a Mandarin Chinese language learning assistant. Analyze the following lesson notes and generate a comprehensive lesson context summary that will be used to create interactive lessons with contextual explanations.

The lesson context should be structured in Markdown format and include the following sections:

# Lesson Overview
A brief 2-3 sentence overview of what this lesson covers and its learning objectives.

## Key Themes
A bulleted list of 2-4 main themes or topics covered in this lesson.

## Grammar Patterns
For each grammar pattern covered:
- Pattern structure (e.g., "Subject + 在 + Location")
- Explanation of when/how to use it
- Example sentences with pinyin and translation

## Vocabulary Categories
Group vocabulary into logical categories (e.g., "Directions", "Time Words", "Actions").
For each category, list the key words with hanzi, pinyin, and meaning.

## Common Challenges
Identify 2-3 common mistakes or confusing points learners might encounter with this material.
Provide tips for remembering or distinguishing similar concepts.

## Cultural Context
If applicable, include relevant cultural notes about usage, formality, or context.

## Learning Objectives
What the student should be able to do after mastering this lesson (2-3 concrete objectives).

Generate comprehensive, detailed content that an AI can use to provide dynamic, contextualized explanations during review. The context should be rich enough to explain relationships between concepts, provide additional examples, and help learners understand WHY certain patterns or words are used.

Respond with ONLY the markdown-formatted lesson context, no JSON wrapping or other text.`

// Interactive Lesson Generation Prompts
export const LESSON_PAGE_GENERATION_PROMPT = `You are creating an interactive Chinese language lesson.

**Lesson Context:**
{LESSON_CONTEXT}

**Cards in Lesson:**
{CARD_LIST}

**Page Number:** {PAGE_NUMBER} of {TOTAL_PAGES}

Create 2-4 educational segments for this page. Use cards from the lesson.

**Segment Types:**
- TEXT: Explain concept (1 paragraph max, 2-4 sentences)
- FLASHCARD: Highlight key vocabulary from the card list
- MULTIPLE_CHOICE: Test comprehension (4 options)
- FILL_IN: Complete sentence with missing word
- TRANSLATION_EN_ZH: Translate English to Chinese
- TRANSLATION_ZH_EN: Translate Chinese to English

**Progressive Difficulty:**
- Early pages (1-3): Introduce vocabulary, simple concepts, basic TEXT and FLASHCARD segments
- Middle pages (4-7): Practice with varied question types (MULTIPLE_CHOICE, FILL_IN)
- Later pages (8-10): Complex translations (TRANSLATION_EN_ZH, TRANSLATION_ZH_EN), cultural notes

**Response Format:**
Return a JSON array of segments. Each segment must have:
- type: One of the SegmentType values above
- content: Object with fields appropriate for that type

**Content Structure by Type:**

TEXT:
{
  "type": "TEXT",
  "content": {
    "text": "Your paragraph here (max 4 sentences)",
    "title": "Optional section title"
  }
}

FLASHCARD:
{
  "type": "FLASHCARD",
  "content": {
    "hanzi": "汉字",
    "pinyin": "hànzì",
    "english": "Chinese characters",
    "notes": "Optional context"
  }
}

MULTIPLE_CHOICE:
{
  "type": "MULTIPLE_CHOICE",
  "content": {
    "question": "What does 你好 mean?",
    "options": ["hello", "goodbye", "thank you", "please"],
    "correctIndex": 0,
    "explanation": "Why this is correct"
  }
}

FILL_IN:
{
  "type": "FILL_IN",
  "content": {
    "sentence": "我___学生。",
    "correctAnswer": "是",
    "pinyin": "Wǒ ___ xuésheng.",
    "translation": "I am a student.",
    "hint": "Use the verb 'to be'"
  }
}

TRANSLATION_EN_ZH:
{
  "type": "TRANSLATION_EN_ZH",
  "content": {
    "sourceText": "I am learning Chinese",
    "acceptableTranslations": ["我在学中文", "我正在学习中文", "我学中文"],
    "hint": "Use 在 or 正在 for ongoing action"
  }
}

TRANSLATION_ZH_EN:
{
  "type": "TRANSLATION_ZH_EN",
  "content": {
    "sourceText": "我喜欢看书",
    "acceptableTranslations": ["I like reading books", "I like to read books", "I enjoy reading"],
    "hint": "Focus on the main verb 喜欢"
  }
}

Return ONLY a valid JSON array of 2-4 segments. No markdown, no explanation, just the JSON array.`

export const MERGE_CONTEXT_PROMPT = `You are a Mandarin Chinese language learning assistant. You need to merge two lesson context documents into one cohesive document.

**Existing Lesson Context:**
{EXISTING_CONTEXT}

**New Content to Merge:**
{NEW_CONTEXT}

**Instructions:**
1. Intelligently merge the two documents, avoiding duplication
2. Keep all unique information from both documents
3. If both cover the same topic/section, combine the information
4. Maintain the original Markdown structure with sections like:
   - # Lesson Overview
   - ## Key Themes
   - ## Grammar Patterns
   - ## Vocabulary Categories
   - ## Common Challenges
   - ## Cultural Context
   - ## Learning Objectives
5. Update the overview to reflect the combined content
6. Remove redundant information - don't repeat the same vocabulary or grammar points
7. If new content adds to existing categories, integrate it smoothly
8. Preserve any unique insights or examples from both documents

Return ONLY the merged markdown document, no JSON wrapping or other text.`

export const TRANSLATION_EVAL_PROMPT = `Evaluate this Chinese translation.

**Question:** Translate to {DIRECTION}: "{SOURCE_TEXT}"
**User Answer:** {USER_ANSWER}
**Expected Answers:** {ACCEPTABLE_ANSWERS}

Determine correctness by evaluating semantic meaning, not exact character matching:
1. **Correct** - Conveys the same meaning (even if using different but equivalent words/grammar)
2. **Partially correct** - Right general idea but minor errors in grammar, tones, or word choice
3. **Incorrect** - Wrong meaning, major grammatical errors, or incomprehensible

Provide helpful feedback:
- isCorrect: boolean (true for correct, false for partially/incorrect)
- explanation: Friendly, specific feedback explaining what was good or what went wrong
- correctAnswer: The best translation from acceptable answers (always include this)
- encouragement: Short positive note to keep learner motivated

Return JSON in this exact format:
{
  "isCorrect": boolean,
  "explanation": "string",
  "correctAnswer": "string",
  "encouragement": "string"
}`
