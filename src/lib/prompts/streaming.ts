import { z } from "zod"
import { PREDEFINED_TAGS } from "@/lib/constants"
import { cardTypeEnum } from "@/lib/validations/card"

// Prompts for the streaming AI routes (parse-notes, generate-pages).
//
// Every prompt here is a fixed *system* prompt (cacheable with
// `cache_control: { type: "ephemeral" }`); anything request-specific (notes,
// card list, lesson context) goes in the user message so the cached prefix
// stays byte-identical across requests. Keep these strings free of
// timestamps, ids or other per-request interpolation.

// ---------------------------------------------------------------------------
// Note parsing (NDJSON: one card object per line)
// ---------------------------------------------------------------------------

export const PARSE_NOTES_SYSTEM = `You are a Mandarin Chinese language learning assistant.
Parse the lesson notes provided by the user into structured flashcard data.

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

OUTPUT FORMAT (strict):
Output one complete JSON object per line (NDJSON). Do NOT wrap the objects in an array,
do NOT separate them with commas, and do NOT use markdown code fences or any other text.
Each line must be a single self-contained object on exactly one line, for example:
{"hanzi":"你好","pinyin":"nǐ hǎo","english":"hello","notes":"Common greeting","type":"PHRASE","suggestedTags":["common","HSK-1"]}
{"hanzi":"在 + place","pinyin":"zài","english":"indicates location","notes":"Subject + 在 + place","type":"GRAMMAR","suggestedTags":["preposition","HSK-1"]}`

export const LESSON_CONTEXT_SYSTEM = `You are a Mandarin Chinese language learning assistant. Analyze the lesson notes provided by the user and generate a comprehensive lesson context summary that will be used to create interactive lessons with contextual explanations.

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

/** Schema for a single card line streamed back by the note parser. */
export const parsedCardSchema = z.object({
  hanzi: z.string().min(1).max(100),
  pinyin: z.string().min(1).max(200),
  english: z.string().min(1).max(500),
  notes: z.string().max(2000).optional().nullable().transform((v) => v ?? undefined),
  type: cardTypeEnum.catch("VOCABULARY"),
  suggestedTags: z.array(z.string().min(1).max(50)).max(10).catch([])
})

export type ParsedCardLine = z.infer<typeof parsedCardSchema>

// ---------------------------------------------------------------------------
// Interactive lesson page generation
// ---------------------------------------------------------------------------

const SEGMENT_FORMAT = `**Segment Types and their content fields:**
- TEXT: { "title": optional string, "text": one paragraph, 2-4 sentences }
- FLASHCARD: { "hanzi", "pinyin", "english", "notes": optional } — highlight key vocabulary from the card list
- MULTIPLE_CHOICE: { "question", "options": exactly 4 strings, "correctIndex": 0-3, "explanation" }
- FILL_IN: { "sentence": contains ___, "correctAnswer", "pinyin", "translation", "hint": optional }
- TRANSLATION_EN_ZH: { "sourceText": English, "acceptableTranslations": array of Chinese strings, "hint": optional }
- TRANSLATION_ZH_EN: { "sourceText": Chinese, "acceptableTranslations": array of English strings, "hint": optional }

Each page has 2-4 segments. Every segment is an object { "type": <segment type>, "content": { ...fields } }.
Always use tone marks in pinyin. Only use vocabulary from the card list (plus basic HSK 1-2 function words).`

export const FIRST_PAGE_SYSTEM = `You are creating page 1 of a multi-page interactive Chinese language lesson. The user message contains the lesson context and the cards in the lesson.

Page 1 is the introduction: welcome the learner, explain the theme in one TEXT segment, then introduce the most important vocabulary with FLASHCARD segments (2-3 flashcards). No quizzes on this page.

${SEGMENT_FORMAT}

**Response Format:**
Return ONLY a single JSON object on one line: { "pageNumber": 1, "segments": [ ... ] }
No markdown, no code fences, no explanation.`

export const REMAINING_PAGES_SYSTEM = `You are creating the remaining pages of a multi-page interactive Chinese language lesson. The user message contains the lesson context, the cards in the lesson, the page 1 that already exists, and which page numbers to write.

**Progressive Difficulty:**
- Page 2: Introduce the remaining vocabulary and grammar with TEXT and FLASHCARD segments
- Pages 3-4: Practice with MULTIPLE_CHOICE and FILL_IN questions (mix both)
- Final page: TRANSLATION_EN_ZH / TRANSLATION_ZH_EN exercises and a short cultural or usage note

Do not repeat page 1. Cover every card in the lesson at least once across the pages.

${SEGMENT_FORMAT}

**OUTPUT FORMAT (strict):**
Output one complete JSON object per line (NDJSON), one line per page, in ascending page order:
{"pageNumber":2,"segments":[...]}
{"pageNumber":3,"segments":[...]}
Do NOT wrap pages in an array or an outer object, do NOT separate lines with commas, and do NOT use markdown code fences or any other text. Each page must be complete on exactly one line.`

// ---------------------------------------------------------------------------
// NDJSON stream helpers
// ---------------------------------------------------------------------------

/**
 * Normalises a single streamed line so lenient models still parse: strips
 * code fences, array brackets and trailing commas. Returns null for lines
 * that carry no object.
 */
export function cleanNdjsonLine(line: string): string | null {
  let s = line.trim()
  if (!s) return null
  if (s.startsWith("```")) return null
  if (s === "[" || s === "]" || s === "{" || s === "}") return null
  if (s.startsWith("[")) s = s.slice(1).trim()
  if (s.endsWith("]")) s = s.slice(0, -1).trim()
  if (s.endsWith(",")) s = s.slice(0, -1).trim()
  if (!s.startsWith("{")) return null
  return s
}

/**
 * Incremental line splitter for NDJSON text streams. Feed text deltas with
 * `push`, which returns every complete line received so far; call `flush` at
 * the end to get whatever is left in the buffer.
 */
export function createLineBuffer() {
  let buffer = ""
  return {
    push(text: string): string[] {
      buffer += text
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      return lines
    },
    flush(): string[] {
      const rest = buffer
      buffer = ""
      return rest.trim() ? [rest] : []
    }
  }
}

/** Parse a cleaned NDJSON line into an object, or null if it is not valid JSON. */
export function parseNdjsonLine(line: string): unknown | null {
  const cleaned = cleanNdjsonLine(line)
  if (!cleaned) return null
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}
