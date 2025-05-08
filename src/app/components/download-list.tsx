"use client"

import { useState, useEffect } from "react"
import { Folder, FileText, Check, AlertCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FolderInfo } from "../page"
import { UploadConfirmationDialog } from "./upload-confirmation-dialogue"

interface DownloadFile {
  id: string
  path: string
  name: string
  status: "completed" | "error" | "pending"
  error?: string
}

interface DownloadFolder {
  id: string
  path: string
  folderName: string
  files: DownloadFile[]
}

export default function DownloadList({setError, setOverallProgress, folderInfo, getFolderInfo}: {setError: (error: string | null) => void , setOverallProgress: (percent: number | null) => void , folderInfo: FolderInfo | null, getFolderInfo: () => void}) {
  const [downloads, setDownloads] = useState<DownloadFolder[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filePath, setFilePath] = useState<string | null>(null)

  const handleUploadClick = (path: string) => {
    setFilePath(path)
    setDialogOpen(true)
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }))
  }

  useEffect(() => {
    const handleProgress = (event: any, progress: any) => {   
      const percent = progress.percent || 
        (progress.totalBytes ? Math.round((progress.bytesUploaded / progress.totalBytes) * 100) : 0);
        const filePath = encodeURI(progress.filePath);
      if (progress.type === 'file-progress') {
        setUploadProgress((prev) => ({
          ...prev,
          [filePath]: percent,
        }));
      } 
      else if (progress.type === 'folder-progress') {
        setUploadProgress((prev) => ({
          ...prev,
          [filePath]: percent,
        }));
      }
      else if (progress.type === 'overall-progress') {
        setOverallProgress(percent);
      }
      else if (progress.type === 'file-complete' || progress.type === 'folder-complete') {
        setUploadProgress((prev) => ({
          ...prev,
          [filePath]: 100,
        }));
      }
    };
  
    if (window.electron?.on) {
      window.electron.on('overall-upload-progress', handleProgress);
      window.electron.on('upload-progress', handleProgress);
      window.electron.on('upload-complete', handleProgress);
    }
  
    return () => {
      if (window.electron?.off) {
        window.electron.off('overall-upload-progress', handleProgress);
        window.electron.off('upload-progress', handleProgress);
        window.electron.off('upload-complete', handleProgress);
      }
    }
  }, [])

  useEffect(() => {
    const fetchDownloads = async () => {
      setIsLoading(true)
      try {
        // In a production app, this would fetch from your Electron main process
        const result = await window.electron?.getDownloadStatus()

        if (result && result.downloads) {
          setDownloads(result.downloads)
          // Expand all folders by default
          const expanded: Record<string, boolean> = {}
          result.downloads.forEach((folder: DownloadFolder) => {
            expanded[folder.id] = true
          })
          setExpandedFolders(expanded)
        } else {
          setDownloads([])
        }
      } catch (error) {
        console.error("Failed to fetch downloads:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDownloads()
  }, [])

  const handleUpload = async () => {
    setError(null)
    setDialogOpen(false)
    getFolderInfo();
    try {
      if (!filePath) {
        setError("File path is not set")
        return
      }
      setOverallProgress(0)
      const result = await window.electron?.uploadPathToDrive(filePath)
      if (result && result.success) {
        console.log("Upload successful")
      } else {
        setError(result.error)
        console.error("Upload failed:", result.error)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to upload")
      setOverallProgress(null)
      console.error("Failed to upload folder:", error)
    } finally{
      setFilePath(null)
    }
  }
  
  const handleCancel = ()=>{
    setDialogOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">Loading download status...</div>
    )
  }

  if (downloads.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No downloads available. Process a CSV file to start downloading.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Downloaded Files</h3>
        <Badge variant="outline" className="px-2 py-1">
          {downloads.reduce((acc, folder) => acc + folder.files.length, 0)} files
        </Badge>
      </div>

      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-4 space-y-4">
          {downloads.map((folder) => (
            <div key={folder.id} className="space-y-2">
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-muted p-2 rounded-md"
                onClick={() => toggleFolder(folder.id)}
              >
                <div>
                <div className="flex items-center space-x-2">
                  <Folder className="h-5 w-5 text-primary" />
                  <span className="font-medium">{folder.folderName}</span>
                </div>
                {uploadProgress[encodeURI(folder.path)] !== undefined && uploadProgress[encodeURI(folder.path)] < 100 && (
                    <div className="w-full mt-2">
                      <Progress value={uploadProgress[encodeURI(folder.path)]} />
                      <span className="text-xs text-muted-foreground mt-1 block">
                        Uploading... {uploadProgress[encodeURI(folder.path)]}%
                      </span>
                    </div>
                  )}
                  {uploadProgress[encodeURI(folder.path)] === 100 && (
                    <div className="text-xs text-green-500 mt-1 block">
                      Upload complete!
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  
                <Badge variant="outline">
                  {folder.files.filter((f) => f.status === "completed").length}/{folder.files.length} files
                </Badge>
                {folder.files.filter((f) => f.status === "completed").length > 0 && (
                  <Button variant="outline" size="sm" className="ml-2" onClick={(e) => {
                    e.stopPropagation();
                    handleUploadClick(folder.path);
                  }}>
                   Upload
                  </Button>
                )}
                </div>
              </div> 
              {expandedFolders[folder.id] && (
              <div className="ml-6 space-y-2">
                <TooltipProvider>
                  {folder.files.map((file) => (
                    file.status === "error" && file.error ? (
                      <Tooltip key={file.id}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-help">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-red-500">{file.name}</span>
                            </div>

                            <AlertCircle className="h-4 w-4 text-red-500" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{file.error}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div key={file.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                        <div>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{file.name} - {file.id}</span>
                        </div>
                        {uploadProgress[encodeURI(file.path)] !== undefined && uploadProgress[encodeURI(file.path)] < 100 && (
                          <div className="w-full mt-2">
                            <Progress value={uploadProgress[encodeURI(file.path)]} />
                            <span className="text-xs text-muted-foreground mt-1 block">
                              Uploading... {uploadProgress[encodeURI(file.path)]}%
                            </span>
                          </div>
                        )}
                        {uploadProgress[encodeURI(file.path)] === 100 && (
                          <div className="text-xs text-green-500 mt-1 block">
                            Upload complete!
                          </div>
                        )}
                        </div>
                        {file.status === "completed" ? (
                          <div className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <Button variant="outline" size="sm" className="ml-2" onClick={() => handleUploadClick(file.path)}>
                          Upload
                         </Button>
                         </div>
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/25 border-t-primary animate-spin" />
                        )}
                      </div>
                    )
                  ))}
                </TooltipProvider>
              </div>
              )}
              <Separator />
            </div>
          ))}
        </div>
      </ScrollArea>

      <UploadConfirmationDialog
        folderInfo={folderInfo}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleUpload}
        onCancel={handleCancel}
      />
    </div>
  )
}
