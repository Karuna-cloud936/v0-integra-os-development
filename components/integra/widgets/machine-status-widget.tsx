"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

interface MachineStatusWidgetProps {
  iconColor: string
}

interface Personnel {
  id: string
  name: string
  avatar: string | null
}

interface Operation {
  id: string
  status: string
  machine: string
  jobNumber: string
  partNumber: string
  description: string
  personnel: Personnel[]
  timeSpent: number
  timeEstimated: number
  completionPercentage: number
  isLate: boolean
}

interface FulcrumData {
  operations: Operation[]
  lastUpdated: string
  error?: string
}

export function MachineStatusWidget({ iconColor }: MachineStatusWidgetProps) {
  const [data, setData] = useState<FulcrumData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOperations = async () => {
    try {
      const result = await apiClient.getFulcrumOperations()

      if (result.error) {
        setError(result.error)
        setData(null)
      } else {
        setData(result)
        setError(null)
      }
    } catch (err) {
      console.error("[v0] Error fetching operations:", err)
      setError("Failed to fetch operations data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOperations()
    const interval = setInterval(fetchOperations, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "inprogress":
        return "bg-orange-500"
      case "complete":
        return "bg-green-500"
      case "paused":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500"
    if (percentage >= 75) return "bg-green-500"
    if (percentage >= 50) return "bg-orange-500"
    return "bg-orange-500"
  }

  if (loading) {
    return (
      <div className="widget-container flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <i className={`fas fa-robot ${iconColor}`}></i>
          <span className="font-semibold">Real Time Operations</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading operations...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="widget-container flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <i className={`fas fa-robot ${iconColor}`}></i>
          <span className="font-semibold">Real Time Operations</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-4">
          <div className="text-muted-foreground text-sm">{error}</div>
        </div>
      </div>
    )
  }

  const operations = data?.operations || []

  return (
    <div className="widget-container flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <i className={`fas fa-robot ${iconColor}`}></i>
          <span className="font-semibold">Real Time Operations</span>
        </div>
        <button
          onClick={fetchOperations}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {operations.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">No active operations</div>
        ) : (
          operations.map((op) => (
            <div key={op.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
              {/* Status and Machine Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Status Badge */}
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded text-white ${getStatusColor(op.status)}`}>
                      {op.status === "inProgress" ? "Paused" : op.status}
                    </span>
                    {op.isLate && <span className="text-xs px-2 py-0.5 rounded bg-red-500 text-white">LATE</span>}
                  </div>
                  {/* Machine Name */}
                  <div className="font-medium text-sm truncate">{op.machine}</div>
                </div>

                {/* Job Info */}
                <div className="text-right text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">{op.jobNumber}</div>
                  {op.partNumber && <div>{op.partNumber}</div>}
                </div>
              </div>

              {/* Description */}
              {op.description && <div className="text-xs text-muted-foreground truncate">{op.description}</div>}

              {/* Personnel and Progress Row */}
              <div className="flex items-center gap-3">
                {/* Personnel Avatars */}
                <div className="flex -space-x-2">
                  {op.personnel.length > 0 ? (
                    op.personnel.map((person, idx) => (
                      <div
                        key={person.id || idx}
                        className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-background"
                        title={person.name}
                      >
                        {person.avatar ? (
                          <img
                            src={person.avatar || "/placeholder.svg"}
                            alt={person.name}
                            className="w-full h-full rounded-full"
                          />
                        ) : (
                          person.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
                      <i className="fas fa-user text-muted-foreground"></i>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden relative">
                    <div
                      className={`h-full ${getProgressColor(op.completionPercentage)} transition-all duration-300 flex items-center justify-center`}
                      style={{ width: `${Math.min(op.completionPercentage, 100)}%` }}
                    >
                      <span className="text-xs font-medium text-white px-2">
                        {formatTime(op.timeSpent)} / {formatTime(op.timeEstimated)}
                      </span>
                    </div>
                  </div>
                  {/* Completion Percentage */}
                  <div className="text-sm font-medium w-12 text-right">{op.completionPercentage}%</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Last Updated */}
      {data?.lastUpdated && (
        <div className="text-xs text-muted-foreground mt-3 text-center">
          Last Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
