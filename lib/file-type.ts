export function getFileType(mimeType: string): string {
  const mimeTypesToExtensions: Record<string, string> = {
    // Common text formats
    "text/plain": "txt",
    "text/html": "html",
    "text/css": "css",
    "text/csv": "csv",
    "application/json": "json",
    "application/javascript": "js",
    "application/xml": "xml",

    // Image formats
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "image/webp": "webp",

    // Document formats
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/msword": "doc",
    "application/vnd.ms-excel": "xls",
    "application/vnd.ms-powerpoint": "ppt",

    // Google Docs formats
    "application/vnd.google-apps.document": "gdoc",
    "application/vnd.google-apps.spreadsheet": "gsheet",
    "application/vnd.google-apps.presentation": "gslides",
    "application/vnd.google-apps.form": "gform",
    "application/vnd.google-apps.drawing": "gdraw",
    "application/vnd.google-apps.map": "gmap",
    "application/vnd.google-apps.site": "gsite",
    "application/vnd.google-apps.jam": "gjam",

    // Compressed formats
    "application/zip": "zip",
    "application/x-rar-compressed": "rar",
    "application/gzip": "gz",
    "application/x-7z-compressed": "7z",

    // Audio formats
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/aac": "aac",

    // Video formats
    "video/mp4": "mp4",
    "video/mpeg": "mpeg",
    "video/webm": "webm",
    "video/quicktime": "mov",
  }

  return mimeTypesToExtensions[mimeType] || ""
}
