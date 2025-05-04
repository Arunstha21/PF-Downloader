"use client"

import { useState, useEffect } from "react"
import { Folder, FileText, Check, AlertCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DownloadFile {
  id: string
  name: string
  status: "completed" | "error" | "pending"
  error?: string
}

interface DownloadFolder {
  id: string
  folderName: string
  files: DownloadFile[]
}

export default function DownloadList() {
  const [downloads, setDownloads] = useState<DownloadFolder[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }))
  }

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
                <div className="flex items-center space-x-2">
                  <Folder className="h-5 w-5 text-primary" />
                  <span className="font-medium">{folder.folderName}</span>
                </div>
                <Badge variant="outline">
                  {folder.files.filter((f) => f.status === "completed").length}/{folder.files.length} files
                </Badge>
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
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        {file.status === "completed" ? (
                          <Check className="h-4 w-4 text-green-500" />
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
    </div>
  )
}
