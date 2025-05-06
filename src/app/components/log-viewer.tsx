"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface LogEntry {
  timestamp: string
  level: string
  message: string
}

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const result = await window.electron?.getLogs()
      if (result && result.logs) {
        setLogs(result.logs)
      } else {
        setLogs([])
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadLogs = () => {
    const logText = logs.map((log) => `${log.timestamp} [${log.level}]: ${log.message}`).join("\n")
    const blob = new Blob([logText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `logs_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearLogs = async () => {
    try {
      await window.electron?.clearLogs()
      setLogs([])
    } catch (error) {
      console.error("Failed to clear logs:", error)
    }
  }

  useEffect(() => {
    fetchLogs()

    // Set up a refresh interval
    const interval = setInterval(fetchLogs, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "error":
        return "text-red-500"
      case "warn":
        return "text-yellow-500"
      case "info":
        return "text-green-500"
      case "debug":
        return "text-blue-500"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Application Logs</h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={downloadLogs} disabled={logs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs} disabled={logs.length === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px] rounded-md border">
        {logs.length > 0 ? (
          <div className="p-4 space-y-2 font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="hover:bg-muted/50 p-1 rounded">
                <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                <span className={`mx-2 font-semibold ${getLogLevelColor(log.level)}`}>[{log.level}]</span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {isLoading ? "Loading logs..." : "No logs available"}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
