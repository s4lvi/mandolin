import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import prisma from "@/lib/prisma"
import { signupSchema } from "@/lib/validations/auth"
import { rateLimited, RATE_LIMITS, getClientIp } from "@/lib/rate-limit"
import { z } from "zod"

export async function POST(req: Request) {
  try {
    const limited = rateLimited(`signup:${getClientIp(req)}`, RATE_LIMITS.SIGNUP)
    if (limited) return limited

    const body = await req.json()
    const { email, password, name } = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        // Create default deck for user
        decks: {
          create: {
            name: "My Deck",
            description: "Default flashcard deck"
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid signup details",
          details: error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message
          }))
        },
        { status: 400 }
      )
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
