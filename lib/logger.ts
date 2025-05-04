import { createLogger, format, transports } from "winston"
import path from "path"
import fs from "fs-extra"
import os from "os";

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define log colors
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
}

export function getDynamicLogsPath() {
  const platform = os.platform(); // 'win32', 'darwin', 'linux'
  let logsDir = "";

  if (platform === "win32") {
    // Use C:\pf-downloader\logs
    logsDir = path.join("C:\\", "pf-downloader", "logs");
  } else if (platform === "darwin") {
    // Use /Users/<username>/applications/pf-downloader/logs
    const userHome = os.homedir();
    logsDir = path.join(userHome, "applications", "pf-downloader", "logs");
  } else {
    // Fallback for Linux or others
    const userHome = os.homedir();
    logsDir = path.join(userHome, ".pf-downloader", "logs");
  }

  // Ensure it exists
  fs.ensureDirSync(logsDir);

  return logsDir;
}

// Add colors to Winston
import { addColors } from "winston"
addColors(colors)
// Create logs directory if it doesn't exist
const logsDir = getDynamicLogsPath();
fs.ensureDirSync(logsDir)

// Define the format for logs
const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
)

// Create a custom format for console output
const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: "HH:mm:ss" }),
  format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
)

// Create the logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels,
  format: logFormat,
  transports: [
    // Write logs to files
    new transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
    }),
    new transports.File({
      filename: path.join(logsDir, "combined.log"),
    }),
    // Console output for development
    new transports.Console({
      format: consoleFormat,
    }),
  ],
})

// Create a stream object for Morgan HTTP logger
const stream = {
  write: (message: string) => {
    logger.http(message.trim())
  },
}

// Add session context to logs
export function createSessionLogger(sessionId: string) {
  return {
    error: (message: string, meta?: any) => {
      logger.error(`[${sessionId}] ${message}`, meta)
    },
    warn: (message: string, meta?: any) => {
      logger.warn(`[${sessionId}] ${message}`, meta)
    },
    info: (message: string, meta?: any) => {
      logger.info(`[${sessionId}] ${message}`, meta)
    },
    http: (message: string, meta?: any) => {
      logger.http(`[${sessionId}] ${message}`, meta)
    },
    debug: (message: string, meta?: any) => {
      logger.debug(`[${sessionId}] ${message}`, meta)
    },
  }
}

export { logger, stream }
