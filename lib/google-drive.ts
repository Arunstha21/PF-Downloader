import { google } from "googleapis"
import fs from "fs-extra"
import path from "path"
import { createSessionLogger, logger } from "./logger"
import { getFileType } from "./file-type"
import archiver from "archiver"
import { getAuthClient } from "./google-auth"
import mime from "mime-types"
import progressStream from 'progress-stream'

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
              success: true,
              path: filePath
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

export async function uploadToDrive(localPath: string, parentFolderId?: string, progressCallback?: (progress: any) => void): Promise<any> {
  const auth = await getAuthClient();
  const drive = google.drive({ version: "v3", auth });

  // Calculate total size for progress tracking
  async function calculateTotalSize(dirPath: string): Promise<number> {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return stats.size;
    }
    
    const items = await fs.readdir(dirPath);
    let total = 0;
    for (const item of items) {
      total += await calculateTotalSize(path.join(dirPath, item));
    }
    return total;
  }
  
  // Track global progress
  let totalUploaded = 0;
  let totalSize = 0;
  
  if (progressCallback) {
    // Initialize progress to 0
    progressCallback({
      type: 'folder-progress',
      filePath: localPath,
      bytesUploaded: 0,
      totalBytes: 1,
      percent: 0
    });
    
    // Calculate total size (this might take a while for large folders)
    totalSize = await calculateTotalSize(localPath);
  }

  const stats = await fs.stat(localPath);
  const name = path.basename(localPath);
  
  // Update progress function
  const updateProgress = (bytesUploaded: number) => {
    if (!progressCallback) return;
  
    totalUploaded += bytesUploaded;
    const percent = Math.min(Math.round((totalUploaded / totalSize) * 100), 100);
  
    // Folder-specific progress
    progressCallback({
      type: 'folder-progress',
      filePath: localPath,
      bytesUploaded: totalUploaded,
      totalBytes: totalSize,
      percent
    });
  
    // Overall progress (can add an ID or global context if desired)
    progressCallback({
      type: 'overall-progress',
      bytesUploaded: totalUploaded,
      totalBytes: totalSize,
      percent
    });
  };
  
  if (stats.isDirectory()) {
    // Upload folder recursively
    const folderMetadata = {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentFolderId ? [parentFolderId] : undefined,
    };
    
    let folder;
    try {
      folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: "id",
      });
      logger.info(`Created folder: ${name} (${folder.data.id})`);
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }

    const folderId = folder.data.id!;
    const items = await fs.readdir(localPath);

    for (const item of items) {
      await uploadToDrive(path.join(localPath, item), folderId, (progress) => {
        if (progress.type === 'file-progress') {
          // Forward the file progress as-is
          if (progressCallback) progressCallback(progress);
        } else if (progress.type === 'file-complete') {
          // Update folder progress when a file completes
          updateProgress(progress.totalBytes || 0);
          if (progressCallback) progressCallback(progress);
        }
      });
    }

    // Ensure we mark as 100% when done
    if (progressCallback) {
      progressCallback({
        type: 'folder-complete',
        filePath: localPath,
        success: true
      });
    }

    return { id: folderId, name };
  } else {
    const fileMetadata = {
      name,
      parents: parentFolderId ? [parentFolderId] : undefined,
    };

    const fileSize = stats.size;
    const fileStream = fs.createReadStream(localPath);
    const progress = progressStream({ length: fileSize, time: 500 });

    // Last reported progress
    let lastProgress = 0;

    progress.on('progress', (prog) => {
      if (progressCallback) {
        // Calculate incremental bytes uploaded since last update
        const incrementalBytes = prog.transferred - lastProgress;
        lastProgress = prog.transferred;
        
        progressCallback({
          type: 'file-progress',
          filePath: localPath,
          bytesUploaded: prog.transferred,
          totalBytes: fileSize,
          percent: Math.round(prog.percentage)
        });

        const newTotalUploaded = totalUploaded + incrementalBytes;
        const overallPercent = Math.min(Math.round((newTotalUploaded / totalSize) * 100), 100);

        progressCallback({
          type: 'overall-progress',
          bytesUploaded: newTotalUploaded,
          totalBytes: totalSize,
          percent: overallPercent
        });
      }
    });

    fileStream.pipe(progress);

    const media = {
      mimeType: mime.lookup(localPath) || "application/octet-stream",
      body: progress,
    };
    
    try {
      const file = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: "id",
      });
  
      logger.info(`Uploaded file: ${name} (${file.data.id})`);
      if (progressCallback) {
        progressCallback({
          type: 'file-complete',
          filePath: localPath,
          bytesUploaded: fileSize,
          totalBytes: fileSize,
          success: true
        });
      }
      return { id: file.data.id, name };
    } catch (error: any) {
      logger.error(`Error uploading file ${name}: ${error.message}`);
      if (progressCallback) {
        progressCallback({
          type: 'file-complete',
          filePath: localPath,
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }
}

export async function getDriveFolderInfo(folderId: string): Promise<any> {
  const auth = await getAuthClient();
  const drive = google.drive({ version: "v3", auth });

  try {
    // Get folder metadata
    const folder = await drive.files.get({
      fileId: folderId,
      fields: "id,name,mimeType,createdTime,modifiedTime,size,webViewLink"
    });

    // Get folder contents (files and subfolders)
    const fileList = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)",
      pageSize: 100
    });

    // Count files and subfolders
    const files = fileList.data.files || [];
    const subfolders = files.filter(file => file.mimeType === 'application/vnd.google-apps.folder');
    const regularFiles = files.filter(file => file.mimeType !== 'application/vnd.google-apps.folder');
    
    // Calculate total size
    const totalSize = regularFiles.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
    
    return {
      id: folder.data.id,
      name: folder.data.name,
      url: folder.data.webViewLink,
      createdTime: folder.data.createdTime,
      modifiedTime: folder.data.modifiedTime,
      contents: {
        totalItems: files.length,
        fileCount: regularFiles.length,
        folderCount: subfolders.length,
        totalSize: totalSize,
        files: regularFiles,
        subfolders: subfolders
      }
    };
  } catch (error) {
    logger.error(`Error getting folder info: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}