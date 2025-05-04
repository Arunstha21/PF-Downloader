
```markdown
# Google Drive Team Folder Downloader

A desktop application built with **Next.js**, **Electron**, and **TypeScript** for downloading files from **Google Drive by file ID** directly into team folders. This tool supports CSV parsing, Google authentication, and displays real-time logs and download status.

---

## 🧩 Features

- ✅ Google Sign-In using OAuth2
- 📁 File and folder picker using Electron
- 📄 CSV-based batch file download
- 💾 Save and load custom settings
- 📥 Download files by Google Drive file ID into team-specific folders
- 📊 Real-time progress and log viewer
- 🌐 Cross-platform support: Windows, macOS, Linux
- 🎨 Beautiful UI built with Tailwind CSS and ShadCN components

---

## 📦 Tech Stack

| Layer         | Technology                   |
|---------------|------------------------------|
| UI            | React, Tailwind CSS, ShadCN  |
| App Framework | Next.js (App Router)         |
| Desktop App   | Electron                     |
| Auth/Storage  | Google Drive API, OAuth2     |
| Language      | TypeScript                   |
| Build Tools   | Electron Builder, ESLint     |

---

## 🔧 Installation

1. **Clone the repository:**

```bash
git clone https://github.com/arunstha21/pf-downloader.git
cd pf-downloader
```

2. **Install dependencies:**

```bash
npm install
# or
yarn install
```

3. **Run in development (Electron + Next.js):**

```bash
npm run electron:dev
```

4. **Build the app for production:**

```bash
npm run electron:build
```

---

## 🚀 Usage

### 1. Sign In with Google
- Use the **Google Sign-In** button to authenticate with your Google Drive account.

### 2. Upload CSV
- Upload a CSV file containing `fileId, teamName` pairs. The app will fetch and download these files accordingly.

### 3. Select Output Folder
- Choose a local folder where the files will be downloaded, organized by `teamName`.

### 4. Start Download
- Click "Start" to begin the download process. Progress and logs will be shown in real-time.

---

## 📂 Project Structure

```
arunstha21-pf-downloader/
├── electron/             # Electron main/preload files
├── lib/                  # Logic for Google API, file handling, logging
├── src/
│   ├── app/              # Next.js app router pages and layout
│   ├── components/       # UI components (ShadCN-based)
│   └── lib/              # Utility functions
├── public/               # Static assets
├── package.json          # Project metadata and scripts
├── next.config.ts        # Next.js config
└── tsconfig.*.json       # TypeScript configurations
```

---

## 🧪 Scripts

| Command                 | Description                                   |
|------------------------|-----------------------------------------------|
| `npm run dev`          | Run Next.js in development mode               |
| `npm run build`        | Build Next.js for production                  |
| `npm run start`        | Start Next.js server                          |
| `npm run lint`         | Run ESLint                                    |
| `npm run electron:dev` | Run Electron app with Next.js in dev          |
| `npm run electron:build` | Build the app for production (cross-platform) |

---

## ⚙️ Configuration

### Google API
You must set up OAuth credentials in your Google Developer Console and enable the **Google Drive API**.

Update your `google-auth.ts` with your `CLIENT_ID`, `CLIENT_SECRET`, and scopes.

---

## 🛡 Permissions

The app requests the following Google Drive scopes:

```plaintext
https://www.googleapis.com/auth/drive.readonly
```

Ensure you authorize this during sign-in for the app to fetch file content.

---

## 📌 Known Limitations

- Currently assumes CSV input is well-formed
- Folder structure is strictly based on `teamName`
- No drag-and-drop for file upload (planned)

---

## 🧭 Roadmap

- [ ] Drag-and-drop CSV upload
- [ ] Google Drive folder picker
- [ ] Export logs as CSV or TXT
- [ ] Retry failed downloads

---

## 👤 Author

**Arun Shrestha**  
📍 Kathmandu, Nepal  
🌐 [LinkedIn](https://www.linkedin.com/in/rangotengo)  
💻 [GitHub](https://github.com/Arunstha21)


## 🙌 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Electron](https://www.electronjs.org/)
- [ShadCN UI](https://ui.shadcn.com/)
- [Google APIs Node.js Client](https://github.com/googleapis/google-api-nodejs-client)

```
