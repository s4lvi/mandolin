import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthenticatedUser, verifyCardOwnership } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"
import { z } from "zod"

const logger = createLogger("api/cards/[cardId]/priority")

const prioritySchema = z.object({
  isPriority: z.boolean()
})

// PATCH /api/cards/[cardId]/priority - Toggle card priority
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    const { cardId } = await params

    // Verify ownership
    const hasAccess = await verifyCardOwnership(cardId, userId)
    if (!hasAccess) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const body = await req.json()
    const { isPriority } = prioritySchema.parse(body)

    const card = await prisma.card.update({
      where: { id: cardId },
      data: { isPriority },
      select: {
        id: true,
        hanzi: true,
        isPriority: true
      }
    })

    logger.info("Updated card priority", { cardId, isPriority })
    return NextResponse.json({ card })
  } catch (error) {
    logger.error("Failed to update card priority", { error })
    return handleRouteError(error)
  }
}
