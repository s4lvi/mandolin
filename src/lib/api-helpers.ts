import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

/**
 * Strip markdown code block markers from a string
 * Useful for parsing AI responses that may be wrapped in ```json blocks
 */
export function stripMarkdownCodeBlock(text: string): string {
  let result = text.trim()

  if (result.startsWith("```json")) {
    result = result.slice(7)
  } else if (result.startsWith("```")) {
    result = result.slice(3)
  }

  if (result.endsWith("```")) {
    result = result.slice(0, -3)
  }

  return result.trim()
}

type Deck = {
  id: string
  userId: string
  name: string
  createdAt: Date
}

type AuthenticatedUserDeckResult =
  | { error: NextResponse; deck: null; userId: null }
  | { error: NextResponse; deck: null; userId: string }
  | { error: null; deck: Deck; userId: string }

/**
 * Authenticate user and get their deck
 * This is a centralized helper to reduce code duplication across API routes
 *
 * @returns {object} - Returns error response if auth fails or deck not found,
 *                     otherwise returns deck and userId
 *
 * @example
 * export async function GET(req: Request) {
 *   const { error, deck, userId } = await getAuthenticatedUserDeck()
 *   if (error) return error
 *
 *   // Continue with authenticated user's deck (both guaranteed non-null)
 * }
 */
export async function getAuthenticatedUserDeck(): Promise<AuthenticatedUserDeckResult> {
  // Check authentication
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      deck: null,
      userId: null
    }
  }

  // Get user's deck
  // TODO: When multi-deck support is added, this should get user's active deck
  // from user preferences instead of always getting the first deck
  const deck = await prisma.deck.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" } // Get most recent deck if multiple exist
  })

  if (!deck) {
    return {
      error: NextResponse.json({ error: "No deck found" }, { status: 404 }),
      deck: null,
      userId: session.user.id
    }
  }

  return {
    error: null,
    deck,
    userId: session.user.id
  }
}

/**
 * Verify that a card belongs to the authenticated user's deck
 *
 * @param cardId - The ID of the card to verify
 * @param userId - The authenticated user's ID
 * @returns Promise<boolean> - True if card belongs to user, false otherwise
 */
export async function verifyCardOwnership(
  cardId: string,
  userId: string
): Promise<boolean> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      deck: {
        select: { userId: true }
      }
    }
  })

  return card?.deck.userId === userId
}

/**
 * Get authenticated user session
 * Simpler helper when you don't need the deck
 *
 * @returns {object} - Returns error response if auth fails, otherwise returns userId
 *
 * @example
 * export async function POST(req: Request) {
 *   const { error, userId } = await getAuthenticatedUser()
 *   if (error) return error
 *   // Continue with userId (guaranteed to be string here)
 * }
 */
export async function getAuthenticatedUser(): Promise<
  | { error: NextResponse; userId: null }
  | { error: null; userId: string }
> {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      userId: null
    }
  }

  return {
    error: null,
    userId: session.user.id
  }
}
