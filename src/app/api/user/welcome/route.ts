import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// POST /api/user/welcome - Mark welcome modal as seen
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { hasSeenWelcome: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating welcome status:", error)
    return NextResponse.json(
      { error: "Failed to update welcome status" },
      { status: 500 }
    )
  }
}
