import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"
import packageJson from "../../../../../package.json"

const logger = createLogger("api/user/version")

// POST /api/user/version - Mark current version as seen
export async function POST() {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    const currentVersion = packageJson.version

    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenVersion: currentVersion }
    })

    logger.info("Version marked as seen", { userId, version: currentVersion })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Failed to update version", { error })
    return handleRouteError(error)
  }
}
