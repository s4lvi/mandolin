import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api/changelog/history")

// GET /api/changelog/history - Get all changelogs ordered by release date (newest first)
export async function GET() {
  try {
    const changelogs = await prisma.changelog.findMany({
      orderBy: { releaseDate: "desc" },
      select: {
        id: true,
        version: true,
        title: true,
        changes: true,
        releaseDate: true,
        createdAt: true
      }
    })

    // Serialize dates to ISO strings
    const serializedChangelogs = changelogs.map(changelog => ({
      id: changelog.id,
      version: changelog.version,
      title: changelog.title,
      changes: changelog.changes,
      releaseDate: changelog.releaseDate.toISOString(),
      createdAt: changelog.createdAt.toISOString()
    }))

    logger.info("Fetched changelog history", { count: changelogs.length })
    return NextResponse.json({ changelogs: serializedChangelogs })
  } catch (error) {
    logger.error("Failed to fetch changelog history", { error })
    return handleRouteError(error)
  }
}
