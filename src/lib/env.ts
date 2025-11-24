/**
 * Environment variable validation
 * This file validates all required environment variables at startup
 * Import this in your root layout to ensure validation happens early
 */

import { z } from "zod"

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // Authentication
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url().optional(),

  // AI
  ANTHROPIC_API_KEY: z
    .string()
    .min(1, "ANTHROPIC_API_KEY is required")
    .startsWith("sk-ant-", "ANTHROPIC_API_KEY must start with 'sk-ant-'"),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development")
})

// Export the validated environment variables
export type Env = z.infer<typeof envSchema>

/**
 * Validate and export environment variables
 * This will throw an error if any required variables are missing or invalid
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map(issue => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")

      console.error("❌ Invalid environment variables:")
      console.error(missingVars)
      console.error("\nPlease check your .env file")

      throw new Error("Invalid environment variables")
    }
    throw error
  }
}

// Validate on module load, but skip during build phase
// During Next.js build, process.env.NEXT_PHASE will be 'phase-production-build'
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build"

// Skip validation during build, but validate at runtime
let _env: Env

function getEnv(): Env {
  if (!_env) {
    _env = isBuildTime
      ? (process.env as any) // Skip validation during build
      : validateEnv()        // Validate at runtime
  }
  return _env
}

// Export a getter that validates on first access
export const env = new Proxy({} as Env, {
  get(_, prop) {
    return getEnv()[prop as keyof Env]
  }
})

/**
 * Helper to check if we're in development mode
 */
export const isDevelopment = process.env.NODE_ENV === "development"

/**
 * Helper to check if we're in production mode
 */
export const isProduction = process.env.NODE_ENV === "production"

/**
 * Helper to check if we're in test mode
 */
export const isTest = process.env.NODE_ENV === "test"
