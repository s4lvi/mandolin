import { PrismaClient } from "@prisma/client"
import { PREDEFINED_TAGS } from "../src/lib/constants"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting tag cleanup...")
  console.log(`Predefined tags: ${PREDEFINED_TAGS.length}`)

  // Get all existing tags
  const allTags = await prisma.tag.findMany()
  console.log(`Total tags in database: ${allTags.length}`)

  // Find tags not in predefined list
  const tagsToDelete = allTags.filter(
    (tag) => !PREDEFINED_TAGS.includes(tag.name as any)
  )
  console.log(`Tags to delete: ${tagsToDelete.length}`)

  if (tagsToDelete.length === 0) {
    console.log("No tags to clean up!")
    return
  }

  // List tags being deleted
  console.log("\nTags being deleted:")
  tagsToDelete.forEach((tag) => console.log(`  - ${tag.name}`))

  // Delete card-tag relationships first
  const tagIds = tagsToDelete.map((t) => t.id)

  const deletedRelations = await prisma.cardTag.deleteMany({
    where: { tagId: { in: tagIds } }
  })
  console.log(`\nDeleted ${deletedRelations.count} card-tag relationships`)

  // Delete the tags
  const deletedTags = await prisma.tag.deleteMany({
    where: { id: { in: tagIds } }
  })
  console.log(`Deleted ${deletedTags.count} tags`)

  // Show remaining tags
  const remainingTags = await prisma.tag.findMany({
    orderBy: { name: "asc" }
  })
  console.log(`\nRemaining tags: ${remainingTags.length}`)
  remainingTags.forEach((tag) => console.log(`  - ${tag.name}`))

  console.log("\nTag cleanup complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
