import Anthropic from "@anthropic-ai/sdk"
import { SegmentType, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { CLAUDE_MODEL_SMART, LESSON_TOTAL_PAGES } from "@/lib/constants"
import { pageResponseSchema, type PageResponse } from "@/lib/validations/lesson"
import {
  FIRST_PAGE_SYSTEM,
  REMAINING_PAGES_SYSTEM,
  createLineBuffer,
  parseNdjsonLine
} from "@/lib/prompts/streaming"
import { createLogger } from "@/lib/logger"
import { AppError } from "@/lib/error-handler"

const logger = createLogger("lib/page-generation")
const anthropic = new Anthropic({ timeout: 120_000, maxRetries: 2 })

export class PageGenerationError extends AppError {
  constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
    this.name = "PageGenerationError"
  }
}

export interface GeneratedPage {
  id: string
  pageNumber: number
  segments: { type: string; orderIndex: number }[]
}

export interface GenerateLessonPagesOptions {
  /** Only generate page 1 (the caller is expected to enqueue the rest). */
  firstPageOnly?: boolean
  /** Replace existing pages (and reset progress) instead of adding to them. */
  regenerate?: boolean
}

type LessonWithCards = Prisma.LessonGetPayload<{
  include: { cards: { include: { card: true } } }
}>

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

async function loadLesson(lessonId: string, deckId: string): Promise<LessonWithCards> {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deckId },
    include: {
      cards: {
        include: { card: true },
        orderBy: [{ order: "asc" }, { card: { createdAt: "asc" } }]
      }
    }
  })
  if (!lesson) throw new PageGenerationError("Lesson not found", 404, "LESSON_NOT_FOUND")
  if (lesson.cards.length === 0) {
    throw new PageGenerationError("Lesson has no cards", 400, "LESSON_EMPTY")
  }
  return lesson
}

function lessonBrief(lesson: LessonWithCards): string {
  const cardList = lesson.cards
    .map((cl) => cl.card)
    .map((card) => `${card.hanzi} (${card.pinyin}): ${card.english}${card.notes ? ` - ${card.notes}` : ""}`)
    .join("\n")
  return `**Lesson Context:**\n${lesson.notes || "No lesson context provided"}\n\n**Cards in Lesson:**\n${cardList}`
}

function toCreateInput(lessonId: string, page: PageResponse): Prisma.LessonPageCreateInput {
  return {
    lesson: { connect: { id: lessonId } },
    pageNumber: page.pageNumber,
    segments: {
      create: page.segments.map((segment, segmentIndex) => ({
        orderIndex: segmentIndex,
        type: segment.type as SegmentType,
        content: segment.content as Prisma.InputJsonValue
      }))
    }
  }
}

function toGeneratedPage(page: {
  id: string
  pageNumber: number
  segments: { type: string; orderIndex: number }[]
}): GeneratedPage {
  return {
    id: page.id,
    pageNumber: page.pageNumber,
    segments: page.segments.map((s) => ({ type: s.type, orderIndex: s.orderIndex }))
  }
}

// ---------------------------------------------------------------------------
// Page 1: small, fast, dedicated call
// ---------------------------------------------------------------------------

async function generateFirstPage(lesson: LessonWithCards): Promise<PageResponse> {
  const stream = anthropic.messages.stream({
    model: CLAUDE_MODEL_SMART,
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    system: [{ type: "text", text: FIRST_PAGE_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `${lessonBrief(lesson)}\n\nWrite page 1 of ${LESSON_TOTAL_PAGES}.`
      }
    ]
  })

  let text = ""
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      text += event.delta.text
    }
  }
  const final = await stream.finalMessage()
  logger.debug("Page 1 usage", {
    lessonId: lesson.id,
    stopReason: final.stop_reason,
    cacheRead: final.usage.cache_read_input_tokens ?? 0,
    cacheWrite: final.usage.cache_creation_input_tokens ?? 0
  })

  // The model is asked for a single line, but accept a code-fenced or
  // multi-line object too by falling back to the outermost braces.
  let raw: unknown = null
  for (const line of text.split("\n")) {
    raw = parseNdjsonLine(line)
    if (raw !== null) break
  }
  if (raw === null) {
    const first = text.indexOf("{")
    const last = text.lastIndexOf("}")
    if (first !== -1 && last > first) {
      try {
        raw = JSON.parse(text.slice(first, last + 1))
      } catch {
        raw = null
      }
    }
  }

  const parsed = pageResponseSchema.safeParse(raw)
  if (!parsed.success) {
    logger.error("Page 1 failed validation", { lessonId: lesson.id, text: text.slice(0, 500) })
    throw new PageGenerationError("AI returned an unexpected response", 502, "AI_BAD_RESPONSE")
  }
  return { ...parsed.data, pageNumber: 1 }
}

// ---------------------------------------------------------------------------
// Pages 2..N: one streamed NDJSON call, inserting each page as it completes
// ---------------------------------------------------------------------------

async function generateRemainingPages(lessonId: string, deckId: string): Promise<number> {
  const lesson = await loadLesson(lessonId, deckId)

  const existing = await prisma.lessonPage.findMany({
    where: { lessonId },
    include: { segments: { orderBy: { orderIndex: "asc" } } },
    orderBy: { pageNumber: "asc" }
  })
  const have = new Set(existing.map((p) => p.pageNumber))
  const missing: number[] = []
  for (let n = 2; n <= LESSON_TOTAL_PAGES; n++) if (!have.has(n)) missing.push(n)
  if (missing.length === 0) return 0

  const firstPage = existing.find((p) => p.pageNumber === 1)
  const firstPageJson = firstPage
    ? JSON.stringify({
        pageNumber: 1,
        segments: firstPage.segments.map((s) => ({ type: s.type, content: s.content }))
      })
    : "(page 1 not available)"

  const stream = anthropic.messages.stream({
    model: CLAUDE_MODEL_SMART,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: [{ type: "text", text: REMAINING_PAGES_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `${lessonBrief(lesson)}\n\n**Page 1 (already written):**\n${firstPageJson}\n\nThe lesson has ${LESSON_TOTAL_PAGES} pages in total. Write pages ${missing.join(", ")} now, one per line.`
      }
    ]
  })

  const wanted = new Set(missing)
  let inserted = 0
  const lines = createLineBuffer()

  const handleLine = async (line: string) => {
    const raw = parseNdjsonLine(line)
    if (raw === null) return
    const parsed = pageResponseSchema.safeParse(raw)
    if (!parsed.success) {
      logger.warn("Skipping invalid page line", { lessonId, issues: parsed.error.issues })
      return
    }
    const page = parsed.data
    if (!wanted.has(page.pageNumber)) return
    wanted.delete(page.pageNumber)
    try {
      await prisma.lessonPage.create({ data: toCreateInput(lessonId, page) })
      inserted++
    } catch (error) {
      // Unique violation means another run already wrote it; anything else is real
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return
      throw error
    }
  }

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      for (const line of lines.push(event.delta.text)) await handleLine(line)
    }
  }
  for (const line of lines.flush()) await handleLine(line)

  const final = await stream.finalMessage()
  if (final.stop_reason === "max_tokens") {
    logger.warn("Remaining pages were truncated", { lessonId, inserted })
  }
  if (wanted.size > 0) {
    logger.warn("Some pages were not generated", { lessonId, missing: [...wanted] })
  }
  logger.info("Remaining pages generated", {
    lessonId,
    inserted,
    cacheRead: final.usage.cache_read_input_tokens ?? 0,
    cacheWrite: final.usage.cache_creation_input_tokens ?? 0
  })
  return inserted
}

async function setGenerating(lessonId: string, pagesGenerating: boolean) {
  await prisma.lesson.updateMany({ where: { id: lessonId }, data: { pagesGenerating } })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate pages for a lesson. Page 1 is always produced synchronously and
 * swapped in (with the old pages, on regenerate) in one transaction once it has
 * validated, so a failed generation never removes working pages. With
 * `firstPageOnly` the lesson is left flagged `pagesGenerating` for the caller
 * to complete via `generateRemainingPagesInBackground`; otherwise the remaining
 * pages are generated before returning.
 */
export async function generateLessonPages(
  lessonId: string,
  deckId: string,
  opts: GenerateLessonPagesOptions = {}
): Promise<{ firstPage: GeneratedPage; generating: boolean }> {
  const lesson = await loadLesson(lessonId, deckId)
  const firstPageData = await generateFirstPage(lesson)

  const firstPage = await prisma.$transaction(async (tx) => {
    if (opts.regenerate) {
      await tx.pageSegment.deleteMany({ where: { page: { lessonId } } })
      await tx.lessonPage.deleteMany({ where: { lessonId } })
      await tx.lessonProgress.deleteMany({ where: { lessonId } })
    }
    const page = await tx.lessonPage.create({
      data: toCreateInput(lessonId, firstPageData),
      include: { segments: { orderBy: { orderIndex: "asc" } } }
    })
    // Fresh pages reflect the current card set; the rest is on its way
    await tx.lesson.update({
      where: { id: lessonId },
      data: { pagesStale: false, pagesGenerating: true }
    })
    return page
  })

  if (opts.firstPageOnly) {
    return { firstPage: toGeneratedPage(firstPage), generating: true }
  }

  try {
    await generateRemainingPages(lessonId, deckId)
  } finally {
    await setGenerating(lessonId, false)
  }
  return { firstPage: toGeneratedPage(firstPage), generating: false }
}

/**
 * Fire-and-forget generation of pages 2..N. Clears `pagesGenerating` when done
 * (or on failure) so status polling never gets stuck.
 */
export function generateRemainingPagesInBackground(lessonId: string, deckId: string): void {
  setGenerating(lessonId, true)
    .then(() => generateRemainingPages(lessonId, deckId))
    .catch((error) => {
      logger.error("Background page generation failed", { error, lessonId })
    })
    .finally(() => {
      setGenerating(lessonId, false).catch((error) => {
        logger.error("Failed to clear pagesGenerating", { error, lessonId })
      })
    })
}

/**
 * Fire-and-forget full generation for a lesson that has no pages yet (e.g.
 * right after upload), so the lesson is ready by the time the user opens it.
 * Lessons that already have pages are left alone.
 */
export function enqueuePageGeneration(lessonId: string, deckId: string): void {
  prisma.lessonPage
    .count({ where: { lessonId } })
    .then((count) => {
      if (count > 0) return
      return generateLessonPages(lessonId, deckId)
    })
    .catch((error) => {
      logger.error("Enqueued page generation failed", { error, lessonId })
      return setGenerating(lessonId, false)
    })
    .catch(() => {})
}
