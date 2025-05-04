export {};

interface ElectronAPI {
  selectFolder: () => Promise<any>;
  selectFile: (options: any) => Promise<any>;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<any>;
  processCSV: (csvData: any) => Promise<any>;
  downloadZip: () => Promise<any>;
  getLogs: () => Promise<any>;
  getDownloadStatus: () => Promise<any>;
  clearLogs: () => Promise<any>;
  getDownloadPath: () => Promise<any>;
  signIn: () => Promise<any>;
  signOut: () => Promise<any>;
  isSignedIn: () => Promise<any>;
  getUserInfo: () => Promise<any>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}