"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"

interface ServerConfigProps {
  onClose: () => void
  onConnect: () => void
}

export function ServerConfig({ onClose, onConnect }: ServerConfigProps) {
  const [serverUrl, setServerUrl] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [useHttps, setUseHttps] = useState(true)

  useEffect(() => {
    const currentUrl = apiClient.getServerUrl()
    if (currentUrl) {
      setServerUrl(currentUrl)
      setUseHttps(currentUrl.startsWith("https"))
    } else {
      setServerUrl("localhost:3443")
    }
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setIsChecking(true)
    const connected = await apiClient.healthCheck()
    setIsConnected(connected)
    setIsChecking(false)
  }

  const handleSave = async () => {
    const protocol = useHttps ? "https://" : "http://"
    const fullUrl = serverUrl.startsWith("http") ? serverUrl : protocol + serverUrl
    apiClient.setServerUrl(fullUrl)
    await checkConnection()
    if (isConnected) {
      onConnect()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">Server Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">Connect to your local Integra OS server</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Protocol</label>
            <div className="flex gap-2">
              <button
                onClick={() => setUseHttps(false)}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                  !useHttps
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-secondary"
                }`}
              >
                HTTP
              </button>
              <button
                onClick={() => setUseHttps(true)}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                  useHttps
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-secondary"
                }`}
              >
                HTTPS
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {useHttps ? "Required for camera/microphone (port 3443)" : "General access (port 3001)"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Server Address</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="localhost:3001 or 192.168.1.100:3443"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Enter server address (without protocol)</p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-border">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm text-foreground">
              {isChecking ? "Checking connection..." : isConnected ? "Connected" : "Not connected"}
            </span>
          </div>

          <button
            onClick={checkConnection}
            disabled={isChecking}
            className="w-full px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            Test Connection
          </button>
        </div>

        <div className="p-6 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
