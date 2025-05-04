"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import FileUploader from "./components/file-uploader"
import DownloadList from "./components/download-list"
import LogViewer from "./components/log-viewer"
import SettingsForm from "./components/settings-form"
import { parseCSV, validateCSVData, convertCSVToDownloadTasks } from "../../lib/csv-parser"
import GoogleSignIn from "./components/google-signin"

export default function Home() {
  const [activeTab, setActiveTab] = useState("download")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    // Check if user is already signed in
    const checkSignIn = async () => {
      try {
        const signedIn = await window.electron?.isSignedIn()
        if (signedIn) {
          const userInfo = await window.electron?.getUserInfo()
          if (userInfo && userInfo.success) {
            setUserInfo(userInfo.user)
            setIsSignedIn(true)
          }
        }
      } catch (err) {
        console.error("Failed to check sign-in status:", err)
      }
    }

    checkSignIn()
  }, [isSignedIn])

  const handleSignOut = async () => {
    try {
      await window.electron?.signOut()
      setIsSignedIn(false)
      setUserInfo(null)
    } catch (err) {
      console.error("Failed to sign out:", err)
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setSuccessMessage(null)

    try {
      // Start progress animation
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 5
        })
      }, 300)

      // Parse the CSV file
      const csvData = await parseCSV(file)

      // Validate the CSV data
      const validation = validateCSVData(csvData)
      if (!validation.valid) {
        throw new Error(`CSV validation failed: ${validation.errors.join(", ")}`)
      }

      // Convert CSV data to download tasks
      const tasks = convertCSVToDownloadTasks(csvData)

      // Process the download tasks via Electron
      const result = await window.electron?.processCSV(tasks)

      clearInterval(progressInterval)

      if (result && result.success) {
        setProgress(100)
        setSuccessMessage("Files processed successfully!")
      } else {
        throw new Error(result?.error || "Failed to process CSV file")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setProgress(0)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadZip = async () => {
    try {
      const result = await window.electron?.downloadZip()
      if (result && result.success) {
        // Reset the UI after successful download
        setSuccessMessage(null)
        setActiveTab("download")
      } else if (result && result.error) {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download ZIP file")
    }
  }

  if (!isSignedIn) {
    return (
      <main className="container mx-auto p-4 min-h-screen flex items-center justify-center">
        <GoogleSignIn onSignedIn={() => setIsSignedIn(true)} />
      </main>
    )
  }

  return (
    <main className="container mx-auto p-4 min-h-screen">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div>
          <CardTitle className="text-2xl">Google Drive File Downloader</CardTitle>
          <CardDescription>
            Upload a CSV file with TeamName, ID_Proof, Bank_details, and Invoice columns to download files from Google
            Drive
          </CardDescription>
          </div>
          {userInfo && (
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <p className="text-sm font-medium">{userInfo.name}</p>
                <p className="text-xs text-muted-foreground">{userInfo.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="download">Download</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="download" className="space-y-4 py-4">
              {!isProcessing && !successMessage && (
                <FileUploader onFileUpload={handleFileUpload} isProcessing={isProcessing} />
              )}

              {isProcessing && (
                <div className="space-y-4 py-6">
                  <p className="text-center text-sm text-muted-foreground">Processing your file...</p>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-200">
                    <AlertTitle className="text-black">Success</AlertTitle>
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                  <DownloadList />
                </div>
              )}
            </TabsContent>

            <TabsContent value="logs">
              <LogViewer />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsForm />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-xs text-muted-foreground">Google Drive File Downloader v1.0.0</p>
          {successMessage && <Button onClick={handleDownloadZip}>Download All Files</Button>}
        </CardFooter>
      </Card>
    </main>
  )
}
