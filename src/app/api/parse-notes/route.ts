import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { parseNotes } from "@/lib/ai"
import prisma from "@/lib/prisma"
import { z } from "zod"

const parseNotesSchema = z.object({
  notes: z.string().min(1, "Notes are required"),
  lessonNumber: z.number().int().positive().optional(),
  lessonTitle: z.string().optional()
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = parseNotesSchema.parse(body)

    // Parse notes with AI
    const parsedCards = await parseNotes(data.notes)

    // Get user's deck to check for existing cards
    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id }
    })

    if (!deck) {
      return NextResponse.json({ error: "No deck found" }, { status: 404 })
    }

    // Get existing cards to mark duplicates
    const existingCards = await prisma.card.findMany({
      where: { deckId: deck.id },
      select: { hanzi: true }
    })
    const existingHanzi = new Set(existingCards.map((c) => c.hanzi))

    // Mark duplicates in the parsed cards
    const cardsWithDuplicateInfo = parsedCards.map((card) => ({
      ...card,
      isDuplicate: existingHanzi.has(card.hanzi)
    }))

    return NextResponse.json({
      cards: cardsWithDuplicateInfo,
      lessonNumber: data.lessonNumber,
      lessonTitle: data.lessonTitle,
      totalParsed: parsedCards.length,
      duplicatesFound: cardsWithDuplicateInfo.filter((c) => c.isDuplicate).length
    })
  } catch (error) {
    console.error("Error parsing notes:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(
      { error: "Failed to parse notes" },
      { status: 500 }
    )
  }
}
