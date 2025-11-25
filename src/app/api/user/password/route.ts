import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"
import { z } from "zod"
import bcrypt from "bcryptjs"

const logger = createLogger("api/user/password")

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters")
})

// POST /api/user/password - Change user password
export async function POST(req: Request) {
  try {
    const { error, userId } = await getAuthenticatedUser()
    if (error) return error

    const body = await req.json()
    const { currentPassword, newPassword } = changePasswordSchema.parse(body)

    // Get current user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      )
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    })

    logger.info("Changed user password", { userId })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Failed to change password", { error })
    return handleRouteError(error)
  }
}
