import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateExampleSentence } from "@/lib/ai"
import { z } from "zod"

const generateSentenceSchema = z.object({
  grammarPoint: z.string().min(1, "Grammar point is required"),
  context: z.string().optional()
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = generateSentenceSchema.parse(body)

    const sentence = await generateExampleSentence(
      data.grammarPoint,
      data.context
    )

    return NextResponse.json(sentence)
  } catch (error) {
    console.error("Error generating sentence:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(
      { error: "Failed to generate sentence" },
      { status: 500 }
    )
  }
}
