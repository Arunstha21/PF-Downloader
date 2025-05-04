import { google } from "googleapis"
import fs from "fs-extra"
import path from "path"
import { createSessionLogger } from "./logger"
import { getFileType } from "./file-type"
import archiver from "archiver"
import { getAuthClient } from "./google-auth"

interface DownloadTask {
  folderName: string
  fileIds: [string, string][]
}
export interface DownloadProgress {
  type: "file-complete";
  folderName: string;
  fileName: string;
  success: boolean;
  error?: string;
}

export async function downloadFilesFromGoogleDrive(
  tasks: DownloadTask[],
  downloadFolder: string,
  sessionId: string,
  progressCallback?: (progress: any) => void
) {
  const logger = createSessionLogger(sessionId)

  try {
    // Ensure the main download folder exists
    await fs.ensureDir(downloadFolder)
    logger.info(`Main download folder created: ${downloadFolder}`)

    // Get authenticated client
    const auth = await getAuthClient();
    const drive = google.drive({ version: "v3", auth })

    // Process each task
    for (const task of tasks) {
      const folderPath = path.join(downloadFolder, task.folderName)

      // Create folder for the team
      await fs.ensureDir(folderPath)
      logger.info(`Created folder: ${task.folderName}`)

      // Download each file
      for (const [fileId, fileName] of task.fileIds) {
        if (!fileId) {
          logger.warn(`Missing file ID for ${fileName} in ${task.folderName}`)
          if (progressCallback) {
            progressCallback({
              type: "file-complete",
              folderName: task.folderName,
              fileName,
              success: false,
              error: "Missing file ID"
            })
          }
          continue
        }

        try {
          // Get file metadata to determine file type
          const fileMetadata = await drive.files.get({
            fileId,
            fields: "name,mimeType",
          })

          // Download the file
          const response = await drive.files.get(
            {
              fileId,
              alt: "media",
            },
            { responseType: "arraybuffer" },
          )

          // Determine file extension from MIME type
          const mimeType = fileMetadata.data.mimeType || ""
          const extension = getFileType(mimeType)

          // Create file name with extension
          const fullFileName = `${fileName}${extension ? `.${extension}` : ""}`
          const filePath = path.join(folderPath, fullFileName)

          // Write file to disk
          await fs.writeFile(filePath, Buffer.from(new Uint8Array(response.data as ArrayBuffer)))

          logger.info(`Downloaded file ${fullFileName} to ${task.folderName}`)
          
          if (progressCallback) {
            progressCallback({
              type: "file-complete",
              folderName: task.folderName,
              fileName,
              success: true
            })
          }
        } catch (error: any) {
          // Handle specific Google API errors
          let errorMessage = error.message
          
          if (error.response && error.response.status === 404) {
            errorMessage = `File not found: ${fileId} (${fileName})`
          } else if (error.response && error.response.status === 403) {
            errorMessage = `Permission denied for file: ${fileId} (${fileName})`
          }
          
          logger.error(`Error downloading file ${fileId} (${fileName}): ${errorMessage}`)
          
          if (progressCallback) {
            progressCallback({
              type: "file-complete",
              folderName: task.folderName,
              fileName,
              success: false,
              error: errorMessage
            })
          }
        }
      }
    }

    logger.info("All files downloaded successfully")
    return { success: true }
  } catch (error: any) {
    logger.error(`Failed to download files: ${error.message}`)
    return {
      success: false,
      error: error.message,
    }
  }
}

export async function createZipArchive(sourceFolder: string, outputPath: string, sessionId: string) {
  const logger = createSessionLogger(sessionId)

  return new Promise<{ success: boolean; filePath?: string; error?: string }>((resolve, reject) => {
    try {
      // Create a file to stream archive data to
      const output = fs.createWriteStream(outputPath)
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Set compression level
      })

      // Listen for all archive data to be written
      output.on("close", () => {
        logger.info(`Archive created: ${outputPath} (${archive.pointer()} bytes)`)
        resolve({ success: true, filePath: outputPath })
      })

      // Handle warnings and errors
      archive.on("warning", (err: any) => {
        if (err.code === "ENOENT") {
          logger.warn(`Archive warning: ${err.message}`)
        } else {
          logger.error(`Archive error: ${err.message}`)
          reject({ success: false, error: err.message })
        }
      })

      archive.on("error", (err: any) => {
        logger.error(`Archive error: ${err.message}`)
        reject({ success: false, error: err.message })
      })

      // Pipe archive data to the file
      archive.pipe(output)

      // Append files from the source directory
      archive.directory(sourceFolder, false)

      // Finalize the archive
      archive.finalize()
    } catch (error: any) {
      logger.error(`Failed to create archive: ${error.message}`)
      reject({ success: false, error: error.message })
    }
  })
}
