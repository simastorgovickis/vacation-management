/**
 * Centralized logging utility
 * In production, integrate with a proper logging service (e.g., Sentry, LogRocket, Winston)
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.isDevelopment && level === 'debug') {
      return // Skip debug logs in production
    }

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...(context && { context }),
    }

    if (this.isDevelopment) {
      // In development, use console for immediate feedback
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
      // eslint-disable-next-line no-console
      console[consoleMethod](`[${timestamp}] [${level.toUpperCase()}]`, message, context || '')
    } else {
      // In production, send to logging service
      // TODO: Integrate with logging service (Sentry, LogRocket, Winston, etc.)
      // Example:
      // loggingService.log(logEntry)
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      ...(error instanceof Error
        ? {
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          }
        : { error }),
    }
    this.log('error', message, errorContext)
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }
}

export const logger = new Logger()
