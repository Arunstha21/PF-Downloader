"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FolderOpen } from "lucide-react"

interface Settings {
  downloadPath: string
  autoDeleteZip: boolean
  logLevel: string
  uploadLink: string
}

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    downloadPath: "",
    autoDeleteZip: true,
    logLevel: "info",
    uploadLink: '',
  })
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true)
      try {
        const savedSettings = await window.electron?.getSettings()
        if (savedSettings) {
          setSettings(savedSettings)
        }
      } catch (err) {
        setError("Failed to load settings")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleChange = (key: string, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
    setIsSaved(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaved(false)

    try {
      await window.electron?.saveSettings(settings)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } catch (err) {
      setError("Failed to save settings")
      console.error(err)
    }
  }

  const selectFolder = async () => {
    try {
      const result = await window.electron?.selectFolder()
      if (result) {
        handleChange("downloadPath", result)
      }
    } catch (err) {
      setError("Failed to select folder")
      console.error(err)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-[400px]">Loading settings...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="downloadPath">Download Location</Label>
            <div className="flex space-x-2">
              <Input
                id="downloadPath"
                value={settings.downloadPath}
                onChange={(e) => handleChange("downloadPath", e.target.value)}
                readOnly
              />
              <Button type="button" variant="outline" onClick={selectFolder}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Choose where downloaded files will be saved</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="uploadLink">Upload File Location</Label>
            <div className="flex space-x-2">
              <Input
                id="uploadLink"
                value={settings.uploadLink}
                placeholder="https://drive.google.com/drive/folders/your-folder-id"
                onChange={(e) => handleChange("uploadLink", e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">Google Drive Folder Link for upload of files.</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoDeleteZip">Auto-delete ZIP after download</Label>
              <Switch
                id="autoDeleteZip"
                checked={settings.autoDeleteZip}
                onCheckedChange={(checked) => handleChange("autoDeleteZip", checked)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically delete ZIP files after they have been downloaded
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="logLevel">Log Level</Label>
            <select
              id="logLevel"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={settings.logLevel}
              onChange={(e) => handleChange("logLevel", e.target.value)}
            >
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
            <p className="text-sm text-muted-foreground">Set the level of detail for application logs</p>
          </div>

      <Separator />

      <div className="flex justify-between items-center">
        {error && (
          <Alert variant="destructive" className="py-2 px-4 max-w-xs">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSaved && (
          <Alert className="bg-green-50 border-green-200 py-2 px-4 max-w-xs">
            <AlertDescription>Settings saved successfully!</AlertDescription>
          </Alert>
        )}

        <div className="ml-auto">
          <Button type="submit">Save Settings</Button>
        </div>
      </div>
    </form>
  )
}
