import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { createLogger } from "./logger"

const logger = createLogger("error-handler")

/**
 * Custom application error class
 * Use this for known, expected errors that should return specific status codes
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = "AppError"
  }
}

/**
 * Centralized error handler for API routes
 * Handles different error types and returns appropriate NextResponse
 *
 * @param error - The error to handle
 * @returns NextResponse with appropriate error message and status code
 *
 * @example
 * try {
 *   // API route logic
 * } catch (error) {
 *   return handleRouteError(error)
 * }
 */
export function handleRouteError(error: unknown): NextResponse {
  // Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.issues.map(issue => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      },
      { status: 400 }
    )
  }

  // Custom app errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code
      },
      { status: error.statusCode }
    )
  }

  // Prisma known errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        // Unique constraint violation
        return NextResponse.json(
          {
            error: "Resource already exists",
            field: error.meta?.target
          },
          { status: 409 }
        )

      case "P2025":
        // Record not found
        return NextResponse.json(
          { error: "Resource not found" },
          { status: 404 }
        )

      case "P2003":
        // Foreign key constraint failed
        return NextResponse.json(
          { error: "Invalid reference" },
          { status: 400 }
        )

      default:
        logger.error("Prisma error", {
          code: error.code,
          meta: error.meta,
          message: error.message
        })
        return NextResponse.json(
          { error: "Database error" },
          { status: 500 }
        )
    }
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.error("Prisma validation error", { error: error.message })
    return NextResponse.json(
      { error: "Invalid data format" },
      { status: 400 }
    )
  }

  // Aborted requests (from prefetch cancellation, etc.)
  if (
    error instanceof Error &&
    (error.message === "aborted" ||
      (error as any).code === "ECONNRESET" ||
      (error as any).code === "ECONNABORTED")
  ) {
    logger.info("Request aborted", { message: error.message })
    return NextResponse.json(
      { error: "Request cancelled" },
      { status: 499 } // Client Closed Request
    )
  }

  // Generic Error instances
  if (error instanceof Error) {
    logger.error("Unhandled error", {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    })

    // In development, return the actual error message
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(
        {
          error: error.message,
          stack: error.stack
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }

  // Unknown error type
  logger.error("Unknown error type", { error })
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  )
}
