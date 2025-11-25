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
    logger.info("Checking changelog", { currentVersion, userId })

    // Get user's last seen version
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastSeenVersion: true }
    })

    logger.info("User version status", {
      lastSeenVersion: user?.lastSeenVersion,
      currentVersion,
      shouldShow: user?.lastSeenVersion !== currentVersion
    })

    // If user has already seen this version, return null
    if (user?.lastSeenVersion === currentVersion) {
      return NextResponse.json({ changelog: null })
    }

    // Get changelog for current version
    logger.info("Fetching changelog from database", { version: currentVersion })
    const changelog = await prisma.changelog.findUnique({
      where: { version: currentVersion }
    })
    logger.info("Changelog query result", { found: !!changelog })

    // If no changelog exists for this version, return null
    if (!changelog) {
      logger.info("No changelog found for version", { version: currentVersion })
      return NextResponse.json({ changelog: null })
    }

    logger.info("Changelog fetched", { userId, version: currentVersion })

    // Serialize dates to ISO strings for JSON response
    return NextResponse.json({
      changelog: {
        id: changelog.id,
        version: changelog.version,
        title: changelog.title,
        changes: changelog.changes,
        releaseDate: changelog.releaseDate.toISOString(),
        createdAt: changelog.createdAt.toISOString()
      }
    })
  } catch (error) {
    logger.error("Failed to fetch changelog", { error })
    return handleRouteError(error)
  }
}
