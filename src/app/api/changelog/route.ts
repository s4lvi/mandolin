import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"
import packageJson from "../../../../package.json"

const logger = createLogger("api/changelog")

// GET /api/changelog - Get latest changelog if user hasn't seen current version
export async function GET() {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    const currentVersion = packageJson.version

    // Get user's last seen version
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastSeenVersion: true }
    })

    // If user has already seen this version, return null
    if (user?.lastSeenVersion === currentVersion) {
      return NextResponse.json({ changelog: null })
    }

    // Get changelog for current version
    const changelog = await prisma.changelog.findUnique({
      where: { version: currentVersion }
    })

    // If no changelog exists for this version, return null
    if (!changelog) {
      logger.info("No changelog found for version", { version: currentVersion })
      return NextResponse.json({ changelog: null })
    }

    logger.info("Changelog fetched", { userId, version: currentVersion })
    return NextResponse.json({ changelog })
  } catch (error) {
    logger.error("Failed to fetch changelog", { error })
    return handleRouteError(error)
  }
}
