import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// Lightweight endpoint just for due card count (used by navbar badge)
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ dueCount: 0 })
    }

    const deck = await prisma.deck.findFirst({
      where: { userId: session.user.id },
      select: { id: true }
    })

    if (!deck) {
      return NextResponse.json({ dueCount: 0 })
    }

    const now = new Date()
    const dueCount = await prisma.card.count({
      where: {
        deckId: deck.id,
        OR: [
          { nextReview: null },
          { nextReview: { lte: now } },
          { state: "NEW" }
        ]
      }
    })

    return NextResponse.json({ dueCount })
  } catch {
    return NextResponse.json({ dueCount: 0 })
  }
}
