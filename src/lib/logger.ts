/**
 * Structured logging utility for the application
 * Provides consistent log formatting and filtering
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogData {
  level: LogLevel
  namespace: string
  message: string
  timestamp: string
  data?: any
  error?: {
    name: string
    message: string
    stack?: string
  }
}

/**
 * Format and output a log entry
 */
function writeLog(logData: LogData) {
  const logString = JSON.stringify(logData)

  switch (logData.level) {
    case "error":
      console.error(logString)
      break
    case "warn":
      console.warn(logString)
      break
    case "info":
      console.info(logString)
      break
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.debug(logString)
      }
      break
  }
}

/**
 * Format error objects for logging
 */
function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    }
  }
  return { message: String(error) }
}

/**
 * Create a namespaced logger
 *
 * @param namespace - The namespace for this logger (e.g., "api/cards", "components/review")
 * @returns Logger instance with debug, info, warn, and error methods
 *
 * @example
 * const logger = createLogger("api/cards")
 * logger.info("Fetching cards", { userId: "123", limit: 20 })
 * logger.error("Failed to create card", { error })
 */
export function createLogger(namespace: string) {
  return {
    /**
     * Log debug information (only in development)
     */
    debug(message: string, data?: any) {
      writeLog({
        level: "debug",
        namespace,
        message,
        timestamp: new Date().toISOString(),
        data
      })
    },

    /**
     * Log informational messages
     */
    info(message: string, data?: any) {
      writeLog({
        level: "info",
        namespace,
        message,
        timestamp: new Date().toISOString(),
        data
      })
    },

    /**
     * Log warning messages
     */
    warn(message: string, data?: any) {
      writeLog({
        level: "warn",
        namespace,
        message,
        timestamp: new Date().toISOString(),
        data
      })
    },

    /**
     * Log error messages
     */
    error(message: string, data?: any) {
      // If data contains an error property, format it
      const formattedData = data?.error
        ? { ...data, error: formatError(data.error) }
        : data

      writeLog({
        level: "error",
        namespace,
        message,
        timestamp: new Date().toISOString(),
        data: formattedData
      })
    }
  }
}

/**
 * Global logger for use outside of specific namespaces
 */
export const logger = createLogger("app")
