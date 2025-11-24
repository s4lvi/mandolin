import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api/user/welcome")

// POST /api/user/welcome - Mark welcome modal as seen
export async function POST() {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    await prisma.user.update({
      where: { id: userId },
      data: { hasSeenWelcome: true }
    })

    logger.info("Welcome modal marked as seen", { userId })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Failed to update welcome status", { error })
    return handleRouteError(error)
  }
}
