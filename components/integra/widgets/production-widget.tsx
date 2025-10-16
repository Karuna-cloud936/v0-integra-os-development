"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

interface ProductionWidgetProps {
  iconColor: string
}

interface WorkCenterProduction {
  id: string
  name: string
  completed: number
  target: number
  efficiency: number
}

interface ProductionData {
  production: WorkCenterProduction[]
  totalCompleted: number
  lastUpdated: string
  error?: string
}

export function ProductionWidget({ iconColor }: ProductionWidgetProps) {
  const [data, setData] = useState<ProductionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProduction = async () => {
    try {
      const result = await apiClient.getFulcrumProduction()

      if (result.error) {
        setError(result.error)
        setData(null)
      } else {
        setData(result)
        setError(null)
      }
    } catch (err) {
      console.error("[v0] Error fetching production:", err)
      setError("Failed to fetch production data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProduction()
    const interval = setInterval(fetchProduction, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const getBarColor = (efficiency: number) => {
    if (efficiency >= 100) return "bg-green-500"
    if (efficiency >= 75) return "bg-green-400"
    if (efficiency >= 50) return "bg-orange-400"
    return "bg-red-400"
  }

  if (loading) {
    return (
      <div className="widget-container flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <i className={`fas fa-chart-simple ${iconColor}`}></i>
          <span className="font-semibold">Production Today</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading production data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="widget-container flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <i className={`fas fa-chart-simple ${iconColor}`}></i>
          <span className="font-semibold">Production Today</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-4">
          <div className="text-muted-foreground text-sm">{error}</div>
        </div>
      </div>
    )
  }

  const production = data?.production || []
  const maxEfficiency = Math.max(...production.map((p) => p.efficiency), 100)

  return (
    <div className="widget-container flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <i className={`fas fa-chart-simple ${iconColor}`}></i>
          <span className="font-semibold">Production Today</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <span className="font-semibold text-foreground">{data?.totalCompleted || 0}</span>
            <span className="text-muted-foreground ml-1">jobs</span>
          </div>
          <button
            onClick={fetchProduction}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-end gap-2 min-h-0">
        {production.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            No production data available
          </div>
        ) : (
          production.map((wc) => (
            <div key={wc.id} className="flex-1 flex flex-col justify-end items-center gap-2 min-w-0">
              {/* Bar */}
              <div className="w-full flex flex-col justify-end items-center" style={{ height: "120px" }}>
                <div
                  className={`w-full ${getBarColor(wc.efficiency)} rounded-t transition-all duration-300 relative group`}
                  style={{ height: `${Math.min((wc.efficiency / maxEfficiency) * 100, 100)}%` }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-popover border border-border rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
                      <div className="font-semibold">{wc.name}</div>
                      <div className="text-muted-foreground">
                        {wc.completed} / {wc.target} ({wc.efficiency}%)
                      </div>
                    </div>
                  </div>
                  {/* Percentage label inside bar if tall enough */}
                  {wc.efficiency > 20 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                      {wc.efficiency}%
                    </div>
                  )}
                </div>
              </div>
              {/* Label */}
              <div className="text-xs text-center truncate w-full" title={wc.name}>
                {wc.name}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Last Updated */}
      {data?.lastUpdated && (
        <div className="text-xs text-muted-foreground mt-3 text-center">
          Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
