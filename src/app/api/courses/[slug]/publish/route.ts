import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// Toggle a user-created course's published (publicly discoverable) state.
// Only the course's creator may publish or unpublish it.
async function setPublished(
  slug: string,
  userId: string,
  isPublished: boolean
): Promise<NextResponse> {
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, userId: true, isBuiltIn: true }
  })

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 })
  }

  if (course.isBuiltIn || course.userId !== userId) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 })
  }

  await prisma.course.update({
    where: { id: course.id },
    data: { isPublished }
  })

  return NextResponse.json({ isPublished })
}

// POST /api/courses/[slug]/publish — make the course publicly discoverable
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { slug } = await params
    return await setPublished(slug, session.user.id, true)
  } catch (error) {
    console.error("Error publishing course:", error)
    return NextResponse.json({ error: "Failed to publish course" }, { status: 500 })
  }
}

// DELETE /api/courses/[slug]/publish — make the course private again
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { slug } = await params
    return await setPublished(slug, session.user.id, false)
  } catch (error) {
    console.error("Error unpublishing course:", error)
    return NextResponse.json({ error: "Failed to unpublish course" }, { status: 500 })
  }
}
