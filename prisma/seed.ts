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

  // Create achievements
  const achievements = [
    // Review milestones
    {
      key: "first_review",
      name: "First Steps",
      description: "Complete your first review",
      icon: "Star",
      xpReward: 50,
      requirement: 1,
      category: "reviews"
    },
    {
      key: "reviews_10",
      name: "Getting Started",
      description: "Complete 10 reviews",
      icon: "Zap",
      xpReward: 100,
      requirement: 10,
      category: "reviews"
    },
    {
      key: "reviews_100",
      name: "Dedicated Learner",
      description: "Complete 100 reviews",
      icon: "Award",
      xpReward: 250,
      requirement: 100,
      category: "reviews"
    },
    {
      key: "reviews_500",
      name: "Study Master",
      description: "Complete 500 reviews",
      icon: "Trophy",
      xpReward: 500,
      requirement: 500,
      category: "reviews"
    },
    {
      key: "reviews_1000",
      name: "Grand Scholar",
      description: "Complete 1000 reviews",
      icon: "Crown",
      xpReward: 1000,
      requirement: 1000,
      category: "reviews"
    },

    // Streak achievements
    {
      key: "streak_3",
      name: "On a Roll",
      description: "Maintain a 3-day streak",
      icon: "Flame",
      xpReward: 100,
      requirement: 3,
      category: "streaks"
    },
    {
      key: "streak_7",
      name: "Week Warrior",
      description: "Maintain a 7-day streak",
      icon: "Flame",
      xpReward: 250,
      requirement: 7,
      category: "streaks"
    },
    {
      key: "streak_30",
      name: "Monthly Master",
      description: "Maintain a 30-day streak",
      icon: "Flame",
      xpReward: 1000,
      requirement: 30,
      category: "streaks"
    },

    // Level achievements
    {
      key: "level_5",
      name: "Rising Star",
      description: "Reach level 5",
      icon: "TrendingUp",
      xpReward: 200,
      requirement: 5,
      category: "levels"
    },
    {
      key: "level_10",
      name: "Expert Learner",
      description: "Reach level 10",
      icon: "Target",
      xpReward: 500,
      requirement: 10,
      category: "levels"
    },

    // XP achievements
    {
      key: "xp_1000",
      name: "XP Hunter",
      description: "Earn 1000 total XP",
      icon: "Coins",
      xpReward: 100,
      requirement: 1000,
      category: "xp"
    },
    {
      key: "xp_10000",
      name: "XP Legend",
      description: "Earn 10000 total XP",
      icon: "Gem",
      xpReward: 500,
      requirement: 10000,
      category: "xp"
    }
  ]

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        requirement: achievement.requirement,
        category: achievement.category
      },
      create: achievement
    })
  }

  console.log("Seeded achievements successfully")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
