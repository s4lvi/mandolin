import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Create initial tags
  const tags = [
    // Parts of speech
    { name: "noun", category: "part-of-speech" },
    { name: "verb", category: "part-of-speech" },
    { name: "adjective", category: "part-of-speech" },
    { name: "adverb", category: "part-of-speech" },
    { name: "pronoun", category: "part-of-speech" },
    { name: "preposition", category: "part-of-speech" },
    { name: "conjunction", category: "part-of-speech" },
    { name: "measure-word", category: "part-of-speech" },

    // Topics
    { name: "food", category: "topic" },
    { name: "travel", category: "topic" },
    { name: "family", category: "topic" },
    { name: "work", category: "topic" },
    { name: "school", category: "topic" },
    { name: "shopping", category: "topic" },
    { name: "weather", category: "topic" },
    { name: "health", category: "topic" },
    { name: "time", category: "topic" },
    { name: "numbers", category: "topic" },
    { name: "colors", category: "topic" },
    { name: "directions", category: "topic" },

    // Daily life
    { name: "greeting", category: "usage" },
    { name: "daily-life", category: "usage" },
    { name: "polite", category: "usage" },
    { name: "informal", category: "usage" },
    { name: "formal", category: "usage" },

    // HSK levels
    { name: "HSK-1", category: "hsk-level" },
    { name: "HSK-2", category: "hsk-level" },
    { name: "HSK-3", category: "hsk-level" },
    { name: "HSK-4", category: "hsk-level" },
    { name: "HSK-5", category: "hsk-level" },
    { name: "HSK-6", category: "hsk-level" }
  ]

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: { category: tag.category },
      create: tag
    })
  }

  console.log("Seeded tags successfully")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
