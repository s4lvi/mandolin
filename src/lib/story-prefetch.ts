import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { CLAUDE_MODEL } from "@/lib/constants"
import { AppError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"

const logger = createLogger("lib/story-prefetch")
const anthropic = new Anthropic({ timeout: 90_000, maxRetries: 2 })

/** Minimum deck size before a story can be generated. */
export const MIN_CARDS_FOR_STORY = 3

// Shape consumed by src/app/(dashboard)/stories/page.tsx (StorySentence / Story).
// Every field is required so the schema is valid for structured outputs; the
// prompt asks for empty arrays when a sentence introduces no new words.
const storyOutputSchema = z.object({
  title: z.string(),
  titlePinyin: z.string(),
  titleEnglish: z.string(),
  sentences: z.array(
    z.object({
      hanzi: z.string(),
      pinyin: z.string(),
      english: z.string(),
      newWords: z.array(z.string()),
      // Per-word glosses for the new words so the reader can show pinyin/english
      // and offer "Add to deck" without a deck lookup.
      newWordDetails: z.array(z.object({ hanzi: z.string(), pinyin: z.string(), english: z.string() }))
    })
  )
})

export type GeneratedStory = z.infer<typeof storyOutputSchema>

export interface SavedStory extends GeneratedStory {
  id: string
}

export class StoryError extends AppError {
  constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
    this.name = "StoryError"
  }
}

// Stable instructions live in `system` (cached across users/calls); only the
// vocabulary list varies per request.
const STORY_SYSTEM_PROMPT = `You are a Chinese language teacher creating a short reading exercise.

The user message contains the student's vocabulary list. Write a short story (3-5 paragraphs, 8-15 sentences total) in Chinese using PRIMARILY that vocabulary. You may introduce 1-2 simple new words if needed for coherence, but mark them clearly.

Guidelines:
- Use simple sentence structures appropriate for the vocabulary level
- Create a coherent, interesting narrative (daily life, school, travel, etc.)
- Every sentence should use at least one word from the student's vocabulary
- Include some dialogue for variety; use Chinese quotation marks for dialogue
- Provide a Chinese title with its pinyin and English translation
- For each sentence provide the hanzi, full pinyin, and an English translation
- For every entry in "newWords", include a matching "newWordDetails" object with pinyin and a short English gloss. Use empty arrays when a sentence has no new words.`

async function selectStoryCards(userId: string) {
  const deck = await prisma.deck.findFirst({ where: { userId }, select: { id: true } })
  if (!deck) throw new StoryError("No deck found", 404, "NO_DECK")

  // Prefer cards the user has reviewed (not brand new) for more relevant stories
  const reviewed = await prisma.card.findMany({
    where: { deckId: deck.id, state: { not: "NEW" } },
    select: { hanzi: true, pinyin: true, english: true },
    orderBy: { lastReviewed: "desc" },
    take: 25 // Most recently reviewed cards (trimmed for speed)
  })

  const cards = reviewed.length > 0 ? reviewed : await prisma.card.findMany({
    where: { deckId: deck.id },
    select: { hanzi: true, pinyin: true, english: true },
    take: 20
  })

  if (cards.length < MIN_CARDS_FOR_STORY) {
    throw new StoryError(
      `You need at least ${MIN_CARDS_FOR_STORY} cards to generate a story`,
      400,
      "NOT_ENOUGH_CARDS"
    )
  }
  return cards
}

/** Call the model with structured outputs and validate the story. */
async function generateStoryText(
  cards: Array<{ hanzi: string; pinyin: string; english: string }>,
  userId: string
): Promise<GeneratedStory> {
  const vocabList = cards.map((c) => `${c.hanzi} (${c.pinyin}): ${c.english}`).join("\n")

  const response = await anthropic.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: [{ type: "text", text: STORY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `**Student's vocabulary:**\n${vocabList}` }],
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: zodOutputFormat(storyOutputSchema) }
  })

  logger.debug("Story generation usage", {
    userId,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    cache_read_input_tokens: response.usage.cache_read_input_tokens,
    cache_creation_input_tokens: response.usage.cache_creation_input_tokens,
    stop_reason: response.stop_reason
  })

  const story = response.parsed_output
  if (!story || !story.title || story.sentences.length === 0 || story.sentences.some((s) => !s.hanzi)) {
    logger.error("Story failed validation", { userId, stop_reason: response.stop_reason, story })
    throw new StoryError("AI returned an unexpected response", 502, "AI_BAD_RESPONSE")
  }
  return story
}

/**
 * Generation core shared by POST /api/stories/generate and the background
 * prefetch: selects vocabulary, generates, validates, and saves the story.
 */
export async function generateAndSaveStory(
  userId: string,
  options: { prefetched?: boolean; onStage?: (stage: "selecting" | "generating" | "finalizing") => void } = {}
): Promise<SavedStory> {
  const { prefetched = false, onStage } = options

  onStage?.("selecting")
  const cards = await selectStoryCards(userId)

  onStage?.("generating")
  const story = await generateStoryText(cards, userId)

  onStage?.("finalizing")
  const saved = await prisma.story.create({
    data: {
      userId,
      title: story.title,
      titlePinyin: story.titlePinyin,
      titleEnglish: story.titleEnglish,
      sentences: story.sentences,
      prefetched
    },
    select: { id: true }
  })
  return { ...story, id: saved.id }
}

/** Does the user have a story generated ahead of time, waiting for "New Story"? */
export async function hasPrefetchedStory(userId: string): Promise<boolean> {
  const count = await prisma.story.count({ where: { userId, prefetched: true } })
  return count > 0
}

/**
 * Atomically claim the user's prefetched story (if any): flips `prefetched`
 * to false and returns it so it can be served as a freshly generated story.
 */
export async function claimPrefetchedStory(userId: string): Promise<SavedStory | null> {
  const story = await prisma.story.findFirst({
    where: { userId, prefetched: true },
    orderBy: { createdAt: "asc" }
  })
  if (!story) return null

  const claimed = await prisma.story.updateMany({
    where: { id: story.id, prefetched: true },
    data: { prefetched: false, createdAt: new Date() }
  })
  if (claimed.count === 0) return null // lost a race with a concurrent claim

  return {
    id: story.id,
    title: story.title,
    titlePinyin: story.titlePinyin,
    titleEnglish: story.titleEnglish,
    sentences: story.sentences as GeneratedStory["sentences"]
  }
}

/** Users with a prefetch currently running in this process. */
const prefetching = new Set<string>()

/**
 * Background prefetch: if the user has enough cards and no story waiting,
 * generate one now and save it with `prefetched: true`. Fire-and-forget;
 * never throws. Callers typically do not await this.
 */
export async function prefetchNextStory(userId: string): Promise<void> {
  if (prefetching.has(userId)) return
  prefetching.add(userId)
  try {
    if (await hasPrefetchedStory(userId)) return

    const deck = await prisma.deck.findFirst({ where: { userId }, select: { id: true } })
    if (!deck) return
    const cardCount = await prisma.card.count({ where: { deckId: deck.id } })
    if (cardCount < MIN_CARDS_FOR_STORY) return

    const started = Date.now()
    const story = await generateAndSaveStory(userId, { prefetched: true })
    logger.info("Prefetched next story", { userId, storyId: story.id, durationMs: Date.now() - started })
  } catch (error) {
    logger.error("Story prefetch failed", { error, userId })
  } finally {
    prefetching.delete(userId)
  }
}
