import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  selectFile: (options: any) => ipcRenderer.invoke("select-file", options),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings: any) => ipcRenderer.invoke("save-settings", settings),
  processCSV: (csvData: any) => ipcRenderer.invoke("process-csv", csvData),
  downloadZip: () => ipcRenderer.invoke("download-zip"),
  getLogs: () => ipcRenderer.invoke("get-logs"),
  getDownloadStatus: () => ipcRenderer.invoke("get-download-status"),
  clearLogs: () => ipcRenderer.invoke("clear-logs"),
  getDownloadPath: () => ipcRenderer.invoke("get-settings").then((s: any) => s.downloadPath),

  signIn: () => ipcRenderer.invoke("google-sign-in"),
  signOut: () => ipcRenderer.invoke("google-sign-out"),
  isSignedIn: () => ipcRenderer.invoke("google-is-signed-in"),
  getUserInfo: () => ipcRenderer.invoke("google-get-user-info"),
});
