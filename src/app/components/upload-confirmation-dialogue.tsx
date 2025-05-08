"use client"

import { ExternalLink, Folder, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface FolderInfo {
  id: string
  name: string
  url: string
}

interface UploadConfirmationDialogProps {
  folderInfo: FolderInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel: () => void
}

export function UploadConfirmationDialog({
  folderInfo,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: UploadConfirmationDialogProps) {
    const isFolderInfoEmpty = 
    !folderInfo || 
    (folderInfo.id === "" && folderInfo.name === "" && folderInfo.url === "");
    if(isFolderInfoEmpty || folderInfo === null) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Error</DialogTitle>
                        <DialogDescription>Folder information is not available. Please go to settings and add the google drive folder link.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-end">
                    <Button variant="outline" onClick={onCancel}>
                        Close
                    </Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }
    const handleRedirect = () => {
        if (window.electron?.openExternal) {
          window.electron.openExternal(folderInfo.url)
        } else {
          window.open(folderInfo.url, "_blank")
        }
      }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" />
            <span>Confirm Upload</span>
          </DialogTitle>
          <DialogDescription>Are you sure you want to upload to this Google Drive folder?</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Folder className="h-8 w-8 text-blue-500 flex-shrink-0" />
            <div className="flex-grow overflow-hidden">
              <h3 className="font-medium text-base truncate">{folderInfo.name}</h3>
              <p className="text-sm text-muted-foreground truncate">Destination folder on Google Drive</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleRedirect} title="Open in Google Drive">
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">Open in Google Drive</span>
            </Button>
          </div>

          <Separator />

          <p className="text-sm text-center text-muted-foreground">
            Click &quot;Upload&quot; to start uploading your files to this folder
          </p>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
