# Google Drive Team Folder Downloader

A cross-platform desktop app built with **Next.js**, **Electron**, and **TypeScript** that lets you download files from **Google Drive** using a CSV of file links and automatically organize them into team folders. It also supports zipping downloads and uploading them back to Drive.

---

## ✨ Features

- ✅ Google OAuth2 Sign-In
- 📄 CSV-based batch download
- 📂 Auto-sorted team folders
- 🗂 Upload to Google Drive after download
- 💾 Download all as ZIP
- 📊 Real-time progress and logs
- 🌐 Cross-platform support: **macOS**, **Windows**, **Linux**
- 🎨 Built with **ShadCN**, **Tailwind CSS**

---

## 🚀 Demo

> Upload a CSV like:

```csv
TeamName,ID_Proof,Bank_details,Invoice
Team Alpha,https://drive.google.com/file/d/ID1/view,https://drive.google.com/file/d/ID2/view,https://drive.google.com/file/d/ID3/view
Team Beta,https://...,https://...,https://...
```

The app downloads each file and organizes them into folders like:

```
/Downloads/GoogleDriveFiles/
├── Team Alpha/
│   ├── ID_Proof.pdf
│   ├── Bank_details.pdf
│   └── Invoice.pdf
```

---

## 🛠 Installation

### 1. Clone the repository

```bash
git clone https://github.com/arunstha21/pf-downloader.git
cd pf-downloader
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Setup `.env` (only for Electron OAuth2)

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 4. Run in development

```bash
npm run electron:dev
```

### 5. Build for production

```bash
npm run electron:build
```

This builds the Next.js app and packages the Electron app into:
- `.dmg` (macOS)
- `.exe` (Windows)
- `.AppImage` (Linux)

---

## ⚙️ Google API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable **Google Drive API** + **OAuth2.0**.
3. Add `http://localhost:3001/oauth2callback` to redirect URIs.
4. Create OAuth2 credentials and copy:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

5. Add them to `.env` and/or GitHub Secrets (`GH_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)

---

## 🧪 Scripts

| Script                  | Purpose                                    |
|-------------------------|--------------------------------------------|
| `npm run dev`           | Run Next.js development server             |
| `npm run electron:dev`  | Run Electron + Next.js in dev              |
| `npm run build`         | Build Next.js app                          |
| `npm run electron:build`| Build Electron production app              |

---

## 🔄 CI/CD (GitHub Actions)

Builds and publishes installers on push to `main`.

- ✅ Uses `electron-builder` with `publish: github`
- 🔐 Requires GitHub secrets:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GH_TOKEN` (for uploading to GitHub Releases)

### 📁 GitHub Actions file

Located at: `.github/workflows/build.yml`

---

## 📂 Project Structure

```
arunstha21-pf-downloader/
├── electron/             # Electron main/preload logic
├── lib/                  # OAuth, CSV parsing, Drive logic
├── src/                  # Next.js frontend (ShadCN UI)
├── public/               # Icons/assets
├── build/                # Exported Next.js app
├── dist-electron/        # Electron build output
├── .github/workflows/    # CI/CD pipeline
```

---

## 📌 Known Limitations

- Only supports specific CSV columns: `TeamName`, `ID_Proof`, `Bank_details`, `Invoice`
- No support for drag-and-drop (planned)
- No retry on failed downloads yet

---

## 🧭 Roadmap

- [ ] Drag-and-drop CSV upload
- [ ] Retry failed downloads
- [ ] Status badges and logs export
- [ ] Team-wise analytics and dashboard
- [ ] Electron auto-updates

---

## 👤 Author

**Arun Shrestha**  
📍 Kathmandu, Nepal  
🔗 [LinkedIn](https://www.linkedin.com/in/rangotengo)  
💻 [GitHub](https://github.com/Arunstha21)

---

## 📄 License

MIT License

---

## 🙌 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Electron](https://www.electronjs.org/)
- [ShadCN UI](https://ui.shadcn.com/)
- [Google APIs Node.js Client](https://github.com/googleapis/google-api-nodejs-client)