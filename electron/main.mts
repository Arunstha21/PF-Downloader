import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent } from "electron";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import Store from "electron-store";
import { downloadFilesFromGoogleDrive, createZipArchive } from "../lib/google-drive.js";
import { logger, createSessionLogger, getDynamicLogsPath } from "../lib/logger.js";
import { getAuthClient, signOut, isSignedIn, getUserInfo } from "../lib/google-auth.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import serve from "electron-serve";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Task {
  folderName: string;
  fileIds: [string, string][];
}

interface DownloadStatus {
  inProgress: boolean;
  downloads: {
    id: string;
    folderName: string;
    files: {
      id: string;
      name: string;
      status: "pending" | "completed" | "error";
      error?: string;
    }[];
  }[];
}

// Initialize store with default settings
const store = new Store({
  defaults: {
    downloadPath: path.join(app.getPath("downloads"), "GoogleDriveFiles"),
    autoDeleteZip: true,
    logLevel: "info",
  },
});

let mainWindow: BrowserWindow | null = null;
const sessionId = uuidv4();
const sessionLogger = createSessionLogger(sessionId);

let downloadStatus: DownloadStatus = {
  inProgress: false,
  downloads: [],
};

const isProd = app.isPackaged;
const appServe = isProd ? serve({
  directory: path.join(__dirname, "../../build")
}) : null;


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../public/icon.png"),
  });
  
  if (isProd) {
    if (!appServe) {
      logger.error("Failed to initialize appServe. Check build path or serve config.");
      return;
    }

    appServe(mainWindow).then(() => {
      if (mainWindow) {
        mainWindow.loadURL("app://-").catch(err => {
          logger.error("Failed to load app://- URL:", err);
        });
      }
    }).catch(err => {
      logger.error("Failed to serve app:", err);
    });
  } else {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
    mainWindow.webContents.on("did-fail-load", (e, code, desc) => {
      logger.error("Dev server load failed:", code, desc);
      mainWindow?.webContents.reloadIgnoringCache();
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openDirectory"],
  });
  return !result.canceled ? result.filePaths[0] : null;
});

ipcMain.handle("select-file", async (_event, options: { filters?: Electron.FileFilter[] }) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openFile"],
    filters: options.filters || [],
  });
  return !result.canceled ? result.filePaths[0] : null;
});

ipcMain.handle("get-settings", () => {
  return {
    downloadPath: store.get("downloadPath"),
    autoDeleteZip: store.get("autoDeleteZip"),
    logLevel: store.get("logLevel"),
  };
});

ipcMain.handle("save-settings", (_event, settings) => {
  Object.entries(settings).forEach(([key, value]) => store.set(key, value));
  if (settings.logLevel) logger.level = settings.logLevel;
  return { success: true };
});

ipcMain.handle('process-csv', async (_event: IpcMainInvokeEvent, tasks: Task[]) => {
  try {
    const downloadPath = store.get('downloadPath');
    
    // Reset download status
    downloadStatus = {
      inProgress: true,
      downloads: tasks.map(task => ({
        id: uuidv4(),
        folderName: task.folderName,
        files: task.fileIds.map(([fileId, fileName]) => ({
          id: uuidv4(),
          name: `${fileName}${fileId ? '' : ' (Missing ID)'}`,
          status: fileId ? 'pending' : 'error',
          error: fileId ? undefined : 'Missing file ID'
        }))
      }))
    };

    // Process the download tasks - note we're not passing credentialsPath anymore
    const result = await downloadFilesFromGoogleDrive(
      tasks,
      downloadPath,
      sessionId,
      (progress) => {
        if (progress.type === "file-complete") {
          const { folderName, fileName, success, error } = progress;
          const folder = downloadStatus.downloads.find((d) => d.folderName === folderName);
          if (folder) {
            const file = folder.files.find((f) => f.name.startsWith(fileName));
            if (file) {
              file.status = success ? "completed" : "error";
              if (error) file.error = error;
            }
          }
        }
      }
    );

    // Update download status
    downloadStatus.inProgress = false;

    return result;
  } catch (error: any) {
    sessionLogger.error(`Failed to process CSV: ${error.message}`);
    downloadStatus.inProgress = false;
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle("get-download-status", () => ({ downloads: downloadStatus.downloads }));

ipcMain.handle("download-zip", async () => {
  try {
    const downloadPath = store.get("downloadPath") as string;
    const autoDeleteZip = store.get("autoDeleteZip") as boolean;
    const zipFileName = `GoogleDriveFiles_${new Date().toISOString().slice(0, 10)}.zip`;
    const zipFilePath = path.join(app.getPath("temp"), zipFileName);

    const result = await createZipArchive(downloadPath, zipFilePath, sessionId);

    if (result.success) {
      const saveResult = await dialog.showSaveDialog(mainWindow!, {
        title: "Save ZIP Archive",
        defaultPath: path.join(app.getPath("downloads"), zipFileName),
        filters: [{ name: "ZIP Archives", extensions: ["zip"] }],
      });

      if (!saveResult.canceled && saveResult.filePath) {
        await fs.copy(zipFilePath, saveResult.filePath);
        await fs.unlink(zipFilePath);

        downloadStatus = {
          inProgress: false,
          downloads: [],
        };

        return { success: true, filePath: saveResult.filePath };
      }
    }

    return result;
  } catch (error: any) {
    sessionLogger.error(`Failed to create ZIP archive: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-logs", async () => {
  try {
    const logsDir = getDynamicLogsPath()
    const logFile = path.join(logsDir, "combined.log");

    if (!fs.existsSync(logFile)) return { logs: [] };

    const logContent = await fs.readFile(logFile, "utf8");
    const logs = logContent
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const regex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}):\d+\s+(\w+):\s+\[.*?\]\s+(.*)$/;
      const match = line.match(regex);
  
      if (match) {
        const [ , rawTimestamp, level, message ] = match;
        const isoTimestamp = new Date(rawTimestamp).toISOString(); // Only valid part used
        return {
          timestampRaw: line.slice(0, 27), // Original full timestamp string
          timestamp: isoTimestamp,
          level,
          message
        };
      } else {
        return {
          timestampRaw: "Invalid",
          timestamp: new Date().toISOString(),
          level: "unknown",
          message: line
        };
      }
    })
    .slice(-100);
  

    return { logs };
  } catch (error: any) {
    sessionLogger.error(`Failed to get logs: ${error.message}`);
    return { logs: [], error: error.message };
  }
});

ipcMain.handle("clear-logs", async () => {
  try {
    const logsDir = getDynamicLogsPath()
    const logFile = path.join(logsDir, "combined.log");
    const errorLogFile = path.join(logsDir, "error.log");

    if (fs.existsSync(logFile)) await fs.writeFile(logFile, "");
    if (fs.existsSync(errorLogFile)) await fs.writeFile(errorLogFile, "");

    sessionLogger.info("Logs cleared by user");
    return { success: true };
  } catch (error: any) {
    sessionLogger.error(`Failed to clear logs: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google-sign-in', async () => {
  try {
    await getAuthClient(true); // Force new token
    return { success: true };
  } catch (error: any) {
    logger.error(`Failed to sign in with Google: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

ipcMain.handle('google-sign-out', async () => {
  try {
    const result = await signOut();
    return result;
  } catch (error: any) {
    logger.error(`Failed to sign out: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

ipcMain.handle('google-is-signed-in', async () => {
  try {
    return await isSignedIn();
  } catch (error: any) {
    logger.error(`Failed to check sign-in status: ${error.message}`);
    return false;
  }
});

ipcMain.handle('google-get-user-info', async () => {
  try {
    return await getUserInfo();
  } catch (error: any) {
    logger.error(`Failed to get user info: ${error.message}`);
    return { 
      success: false, 
      error: error.message 
    };
  }
});
