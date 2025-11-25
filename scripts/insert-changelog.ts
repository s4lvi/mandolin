/**
 * Script to insert changelog into database
 * Usage: ts-node scripts/insert-changelog.ts <version>
 */

import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const prisma = new PrismaClient()

async function insertChangelog(version: string) {
  const changelogPath = path.join(
    process.cwd(),
    "changelogs",
    `${version}.json`
  )

  // Check if changelog file exists
  if (!fs.existsSync(changelogPath)) {
    console.log(`ℹ️  No changelog file found for version ${version}`)
    console.log(`   Expected: ${changelogPath}`)
    console.log(`   Skipping changelog insertion.`)
    return
  }

  // Read and parse changelog
  const changelogData = JSON.parse(fs.readFileSync(changelogPath, "utf-8"))

  // Validate changelog structure
  if (
    !changelogData.version ||
    !changelogData.title ||
    !Array.isArray(changelogData.changes)
  ) {
    console.error("❌ Invalid changelog format")
    console.error("   Required fields: version, title, changes (array)")
    process.exit(1)
  }

  // Validate changes array is not empty
  if (changelogData.changes.length === 0) {
    console.error("❌ Invalid changelog format")
    console.error("   changes array must contain at least one item")
    process.exit(1)
  }

  // Validate version matches the requested version
  if (changelogData.version !== version) {
    console.error("❌ Version mismatch")
    console.error(`   Requested version: ${version}`)
    console.error(`   Changelog file version: ${changelogData.version}`)
    console.error("   The version in the JSON file must match the filename")
    process.exit(1)
  }

  console.log(`📝 Inserting changelog for v${changelogData.version}...`)

  try {
    // Upsert changelog (insert or update if exists)
    const changelog = await prisma.changelog.upsert({
      where: { version: changelogData.version },
      update: {
        title: changelogData.title,
        changes: changelogData.changes,
        releaseDate: new Date()
      },
      create: {
        version: changelogData.version,
        title: changelogData.title,
        changes: changelogData.changes,
        releaseDate: new Date()
      }
    })

    console.log(`✅ Changelog inserted successfully`)
    console.log(`   Version: ${changelog.version}`)
    console.log(`   Title: ${changelog.title}`)
    console.log(`   Changes: ${changelog.changes.length} items`)
  } catch (error) {
    console.error("❌ Failed to insert changelog:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Get version from command line argument or package.json
const version = process.argv[2]

if (!version) {
  console.error("❌ Version argument required")
  console.error("   Usage: ts-node scripts/insert-changelog.ts <version>")
  process.exit(1)
}

insertChangelog(version)
