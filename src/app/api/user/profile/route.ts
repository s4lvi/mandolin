import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"
import { z } from "zod"

const logger = createLogger("api/user/profile")

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional()
})

// GET /api/user/profile - Get user profile
export async function GET() {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    logger.info("Fetched user profile", { userId })
    return NextResponse.json({ user })
  } catch (error) {
    logger.error("Failed to fetch user profile", { error })
    return handleRouteError(error)
  }
}

// PATCH /api/user/profile - Update user profile
export async function PATCH(req: Request) {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    const body = await req.json()
    const data = updateProfileSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        bio: data.bio
      },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        updatedAt: true
      }
    })

    logger.info("Updated user profile", { userId })
    return NextResponse.json({ user })
  } catch (error) {
    logger.error("Failed to update user profile", { error })
    return handleRouteError(error)
  }
}
