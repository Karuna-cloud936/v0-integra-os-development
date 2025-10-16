"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

interface InventoryWidgetProps {
  iconColor: string
}

interface InventoryItem {
  itemId: string
  itemNumber: string
  description: string
  onHand: number
  available: number
  reserved: number
  unit: string
  lowStockThreshold?: number
}

interface InventoryData {
  items: InventoryItem[]
  lastUpdated: string
  error?: string
}

export function InventoryWidget({ iconColor }: InventoryWidgetProps) {
  const [data, setData] = useState<InventoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "low" | "out">("all")

  const fetchInventory = async () => {
    try {
      const result = await apiClient.getFulcrumInventory()

      if (result.error) {
        setError(result.error)
        setData(null)
      } else {
        setData(result)
        setError(null)
      }
    } catch (err) {
      console.error("[v0] Error fetching inventory:", err)
      setError("Failed to fetch inventory data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
    const interval = setInterval(fetchInventory, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const getStockStatus = (item: InventoryItem) => {
    if (item.onHand === 0) return "out"
    if (item.lowStockThreshold && item.onHand <= item.lowStockThreshold) return "low"
    return "ok"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "out":
        return "bg-red-500"
      case "low":
        return "bg-orange-500"
      default:
        return "bg-green-500"
    }
  }

  const filteredItems =
    data?.items.filter((item) => {
      const status = getStockStatus(item)
      if (filter === "low") return status === "low"
      if (filter === "out") return status === "out"
      return true
    }) || []

  if (loading) {
    return (
      <div className="widget-container flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <i className={`fas fa-boxes-stacked ${iconColor}`}></i>
          <span className="font-semibold">Inventory</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading inventory...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="widget-container flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <i className={`fas fa-boxes-stacked ${iconColor}`}></i>
          <span className="font-semibold">Inventory</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-4">
          <div className="text-muted-foreground text-sm">{error}</div>
        </div>
      </div>
    )
  }

  const lowStockCount = data?.items.filter((item) => getStockStatus(item) === "low").length || 0
  const outOfStockCount = data?.items.filter((item) => getStockStatus(item) === "out").length || 0

  return (
    <div className="widget-container flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <i className={`fas fa-boxes-stacked ${iconColor}`}></i>
          <span className="font-semibold">Inventory</span>
        </div>
        <button
          onClick={fetchInventory}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      {/* Stock Status Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`p-2 rounded-lg border transition-colors ${
            filter === "all" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
          }`}
        >
          <div className="text-xs text-muted-foreground">Total Items</div>
          <div className="text-lg font-bold">{data?.items.length || 0}</div>
        </button>
        <button
          onClick={() => setFilter("low")}
          className={`p-2 rounded-lg border transition-colors ${
            filter === "low" ? "border-orange-500 bg-orange-500/10" : "border-border hover:border-orange-500/50"
          }`}
        >
          <div className="text-xs text-muted-foreground">Low Stock</div>
          <div className="text-lg font-bold text-orange-500">{lowStockCount}</div>
        </button>
        <button
          onClick={() => setFilter("out")}
          className={`p-2 rounded-lg border transition-colors ${
            filter === "out" ? "border-red-500 bg-red-500/10" : "border-border hover:border-red-500/50"
          }`}
        >
          <div className="text-xs text-muted-foreground">Out of Stock</div>
          <div className="text-lg font-bold text-red-500">{outOfStockCount}</div>
        </button>
      </div>

      {/* Inventory List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredItems.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            {filter === "all" ? "No inventory items" : `No ${filter === "low" ? "low stock" : "out of stock"} items`}
          </div>
        ) : (
          filteredItems.map((item) => {
            const status = getStockStatus(item)
            return (
              <div key={item.itemId} className="bg-card border border-border rounded-lg p-3 space-y-2">
                {/* Item Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.itemNumber}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(status)} flex-shrink-0 mt-1`} title={status} />
                </div>

                {/* Stock Levels */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-muted/50 rounded p-2">
                    <div className="text-muted-foreground">On Hand</div>
                    <div className="font-bold text-sm">
                      {item.onHand} {item.unit}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <div className="text-muted-foreground">Available</div>
                    <div className="font-bold text-sm">
                      {item.available} {item.unit}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <div className="text-muted-foreground">Reserved</div>
                    <div className="font-bold text-sm">
                      {item.reserved} {item.unit}
                    </div>
                  </div>
                </div>

                {/* Low Stock Warning */}
                {status === "low" && (
                  <div className="text-xs text-orange-500 flex items-center gap-1">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>Low stock alert</span>
                  </div>
                )}
                {status === "out" && (
                  <div className="text-xs text-red-500 flex items-center gap-1">
                    <i className="fas fa-times-circle"></i>
                    <span>Out of stock</span>
                  </div>
                )}
              </div>
            )
          })
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
