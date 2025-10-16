// API client for communicating with local server

import type { IntegraSyncedData } from "./integra-state"

const getApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:3001"
  }
  return localStorage.getItem("integra_server_url") || "http://localhost:3001"
}

const MOCK_DATA = {
  employees: [
    { id: "1", name: "John Smith", department: "Production", position: "Operator", hireDate: "2020-01-15" },
    { id: "2", name: "Sarah Johnson", department: "Quality", position: "Inspector", hireDate: "2019-06-20" },
    { id: "3", name: "Mike Wilson", department: "Maintenance", position: "Technician", hireDate: "2021-03-10" },
    { id: "4", name: "Emily Brown", department: "Production", position: "Supervisor", hireDate: "2018-11-05" },
  ],
  trainingRecords: [
    {
      id: "1",
      employeeId: "1",
      trainingId: "safety-101",
      completedDate: "2024-01-15",
      expiryDate: "2025-01-15",
      score: 95,
    },
    {
      id: "2",
      employeeId: "1",
      trainingId: "forklift",
      completedDate: "2024-02-20",
      expiryDate: "2027-02-20",
      score: 88,
    },
    {
      id: "3",
      employeeId: "2",
      trainingId: "quality-control",
      completedDate: "2024-03-10",
      expiryDate: "2025-03-10",
      score: 92,
    },
  ],
  devices: [
    { id: "device-1", name: "Production Floor - Station 1", lastSeen: new Date().toISOString() },
    { id: "device-2", name: "Quality Lab - Terminal", lastSeen: new Date().toISOString() },
    { id: "device-3", name: "Office - Manager Desk", lastSeen: new Date().toISOString() },
  ],
  messages: [
    {
      id: "1",
      from: "device-1",
      to: "device-2",
      text: "Quality check needed on batch 1234",
      timestamp: Date.now() - 300000,
      read: false,
    },
    {
      id: "2",
      from: "device-3",
      to: "device-1",
      text: "Production meeting at 2pm",
      timestamp: Date.now() - 600000,
      read: true,
    },
  ],
  inventory: {
    items: [
      { itemNumber: "MAT-001", description: "Steel Sheet 4x8", onHand: 150, available: 120, reserved: 30, unit: "EA" },
      { itemNumber: "MAT-002", description: "Aluminum Rod 1in", onHand: 45, available: 45, reserved: 0, unit: "FT" },
      { itemNumber: "MAT-003", description: "Plastic Pellets", onHand: 5, available: 5, reserved: 0, unit: "LB" },
      { itemNumber: "MAT-004", description: "Fastener Kit", onHand: 0, available: 0, reserved: 0, unit: "KIT" },
      { itemNumber: "MAT-005", description: "Paint - Blue", onHand: 25, available: 20, reserved: 5, unit: "GAL" },
    ],
    lastUpdated: new Date().toISOString(),
  },
  operations: {
    operations: [
      {
        jobNumber: "JOB-1001",
        operation: "Cutting",
        machine: "CNC-01",
        operator: "John Smith",
        progress: 75,
        startTime: "08:00",
        estimatedEnd: "12:00",
      },
      {
        jobNumber: "JOB-1002",
        operation: "Welding",
        machine: "WELD-03",
        operator: "Mike Wilson",
        progress: 45,
        startTime: "09:30",
        estimatedEnd: "14:30",
      },
      {
        jobNumber: "JOB-1003",
        operation: "Assembly",
        machine: "ASSY-02",
        operator: "Sarah Johnson",
        progress: 90,
        startTime: "07:00",
        estimatedEnd: "11:00",
      },
    ],
    lastUpdated: new Date().toISOString(),
  },
  production: {
    production: [
      { workCenter: "Machining", completed: 45, target: 50, efficiency: 90 },
      { workCenter: "Welding", completed: 32, target: 40, efficiency: 80 },
      { workCenter: "Assembly", completed: 58, target: 60, efficiency: 97 },
      { workCenter: "Finishing", completed: 28, target: 45, efficiency: 62 },
    ],
    totalCompleted: 163,
    lastUpdated: new Date().toISOString(),
  },
}

export class ApiClient {
  private baseUrl: string
  private useMockData = true // Default to true for preview mode
  private initialized = false

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getApiBaseUrl()
    // Auto-check server availability on first use
    this.initialize()
  }

  private async initialize() {
    if (this.initialized) return
    this.initialized = true
    await this.checkServerAvailability()
  }

  async checkServerAvailability(): Promise<void> {
    const isAvailable = await this.healthCheck()
    this.useMockData = !isAvailable
    if (this.useMockData) {
      console.log("[v0] [API Client] Server unavailable - using mock data for preview")
    } else {
      console.log("[v0] [API Client] Server connected successfully")
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(2000), // 2 second timeout
      })
      return response.ok
    } catch (error) {
      console.log("[v0] [API Client] Health check failed - server may not be running")
      return false
    }
  }

  async getState(): Promise<IntegraSyncedData | null> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Returning mock state")
      return null // Let the app use its default state
    }

    try {
      console.log("[v0] [Client] Fetching state from:", `${this.baseUrl}/api/state`)
      const response = await fetch(`${this.baseUrl}/api/state`)
      if (!response.ok) throw new Error("Failed to get state")
      const state = await response.json()
      console.log("[v0] [Client] State fetched:", state ? "success" : "null")
      return state
    } catch (error) {
      console.error("[v0] [Client] Error getting state:", error)
      return null
    }
  }

  async saveState(state: IntegraSyncedData): Promise<{ success: boolean; lastModified?: number }> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Mock mode - state saved locally only")
      return { success: true, lastModified: Date.now() }
    }

    try {
      const deviceId =
        typeof window !== "undefined" ? localStorage.getItem("integra_device_id") || "unknown" : "unknown"

      console.log("[v0] [Client] Saving state from device:", deviceId)

      const response = await fetch(`${this.baseUrl}/api/state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": deviceId,
        },
        body: JSON.stringify(state),
      })

      if (!response.ok) throw new Error("Failed to save state")
      const result = await response.json()
      console.log("[v0] [Client] Save result:", result)
      return result
    } catch (error) {
      console.error("[v0] [Client] Error saving state:", error)
      return { success: false }
    }
  }

  async uploadPdf(file: File): Promise<string | null> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Mock mode - PDF upload simulated")
      return `/mock-pdfs/${file.name}`
    }

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${this.baseUrl}/api/upload-pdf`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to upload PDF")
      const data = await response.json()

      // Return full URL with server base URL
      return `${this.baseUrl}${data.url}`
    } catch (error) {
      console.error("[API] Error uploading PDF:", error)
      return null
    }
  }

  async deletePdf(url: string): Promise<boolean> {
    if (this.useMockData) {
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/delete-pdf`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      return response.ok
    } catch (error) {
      console.error("[API] Error deleting PDF:", error)
      return false
    }
  }

  async registerDevice(deviceId: string, deviceName: string): Promise<boolean> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Mock mode - device registered:", deviceName)
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/devices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, deviceName }),
      })
      return response.ok
    } catch (error) {
      console.error("[API] Error registering device:", error)
      return false
    }
  }

  async updateDeviceName(deviceId: string, deviceName: string): Promise<boolean> {
    if (this.useMockData) {
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceName }),
      })
      return response.ok
    } catch (error) {
      console.error("[API] Error updating device name:", error)
      return false
    }
  }

  async getDevices(): Promise<any[]> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Returning mock devices")
      return MOCK_DATA.devices
    }

    try {
      console.log("[v0] [API Client] Fetching devices from:", `${this.baseUrl}/api/devices`)
      const response = await fetch(`${this.baseUrl}/api/devices`)
      if (!response.ok) {
        console.error("[v0] [API Client] Failed to fetch devices, status:", response.status)
        throw new Error("Failed to get devices")
      }
      const devices = await response.json()
      console.log("[v0] [API Client] Received devices:", devices)
      return devices
    } catch (error) {
      console.error("[v0] [API Client] Error getting devices:", error)
      return []
    }
  }

  async getMessages(): Promise<any[]> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Returning mock messages")
      return MOCK_DATA.messages
    }

    try {
      console.log("[v0] [API Client] Fetching messages from:", `${this.baseUrl}/api/messages`)
      const response = await fetch(`${this.baseUrl}/api/messages`)
      if (!response.ok) {
        console.error("[v0] [API Client] Failed to fetch messages, status:", response.status)
        throw new Error("Failed to get messages")
      }
      const data = await response.json()
      console.log("[v0] [API Client] Received messages:", data.messages?.length || 0)
      return data.messages || []
    } catch (error) {
      console.error("[v0] [API Client] Error getting messages:", error)
      return []
    }
  }

  async sendMessage(message: any): Promise<boolean> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Mock mode - message sent:", message.text)
      return true
    }

    try {
      console.log("[v0] [API Client] Sending message to:", `${this.baseUrl}/api/messages`)
      console.log("[v0] [API Client] Message data:", message)
      const response = await fetch(`${this.baseUrl}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      })
      const result = response.ok
      console.log("[v0] [API Client] Send message result:", result)
      return result
    } catch (error) {
      console.error("[v0] [API Client] Error sending message:", error)
      return false
    }
  }

  async getSignalingMessages(deviceId: string): Promise<any[]> {
    if (this.useMockData) {
      return []
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/signaling?deviceId=${deviceId}`)
      if (!response.ok) throw new Error("Failed to get signaling messages")
      const data = await response.json()
      return data.messages || []
    } catch (error) {
      console.error("[API] Error getting signaling messages:", error)
      return []
    }
  }

  async sendSignalingMessage(message: any): Promise<boolean> {
    if (this.useMockData) {
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/signaling`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      })
      return response.ok
    } catch (error) {
      console.error("[API] Error sending signaling message:", error)
      return false
    }
  }

  async sendNotification(
    toDevice: string,
    fromDevice: string,
    type: string,
    title: string,
    message?: string,
    data?: any,
  ): Promise<boolean> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Mock mode - notification sent:", title)
      return true
    }

    try {
      console.log("[v0] [API Client] Sending notification:", { toDevice, fromDevice, type, title })
      const response = await fetch(`${this.baseUrl}/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toDevice, fromDevice, type, title, message, data }),
      })
      return response.ok
    } catch (error) {
      console.error("[v0] [API Client] Error sending notification:", error)
      return false
    }
  }

  async getNotifications(deviceId: string, unreadOnly = false): Promise<any[]> {
    if (this.useMockData) {
      return []
    }

    try {
      const url = `${this.baseUrl}/api/notifications/${deviceId}${unreadOnly ? "?unreadOnly=true" : ""}`
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to get notifications")
      return await response.json()
    } catch (error) {
      console.error("[v0] [API Client] Error getting notifications:", error)
      return []
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    if (this.useMockData) {
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      })
      return response.ok
    } catch (error) {
      console.error("[v0] [API Client] Error marking notification as read:", error)
      return false
    }
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    if (this.useMockData) {
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/notifications/${notificationId}`, {
        method: "DELETE",
      })
      return response.ok
    } catch (error) {
      console.error("[v0] [API Client] Error deleting notification:", error)
      return false
    }
  }

  async getEmployees(): Promise<any[]> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Returning mock employees")
      return MOCK_DATA.employees
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/employees`)
      if (!response.ok) throw new Error("Failed to get employees")
      return await response.json()
    } catch (error) {
      console.error("[API] Error getting employees:", error)
      return []
    }
  }

  async createEmployee(employee: any): Promise<boolean> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Mock mode - employee created:", employee.name)
      MOCK_DATA.employees.push({ ...employee, id: Date.now().toString() })
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee),
      })
      return response.ok
    } catch (error) {
      console.error("[API] Error creating employee:", error)
      return false
    }
  }

  async updateEmployee(id: string, employee: any): Promise<boolean> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Mock mode - employee updated:", id)
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee),
      })
      return response.ok
    } catch (error) {
      console.error("[API] Error updating employee:", error)
      return false
    }
  }

  async deleteEmployee(id: string): Promise<boolean> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Mock mode - employee deleted:", id)
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/employees/${id}`, {
        method: "DELETE",
      })
      return response.ok
    } catch (error) {
      console.error("[v0] [API Client] Error deleting employee:", error)
      return false
    }
  }

  async getTrainingRecords(): Promise<any[]> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Returning mock training records")
      return MOCK_DATA.trainingRecords
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/training-records`)
      if (!response.ok) throw new Error("Failed to get training records")
      return await response.json()
    } catch (error) {
      console.error("[API] Error getting training records:", error)
      return []
    }
  }

  async createTrainingRecord(record: any): Promise<boolean> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Mock mode - training record created")
      MOCK_DATA.trainingRecords.push({ ...record, id: Date.now().toString() })
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/training-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      })
      return response.ok
    } catch (error) {
      console.error("[v0] [API Client] Error creating training record:", error)
      return false
    }
  }

  async deleteTrainingRecord(id: string): Promise<boolean> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Mock mode - training record deleted:", id)
      return true
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/training-records/${id}`, {
        method: "DELETE",
      })
      return response.ok
    } catch (error) {
      console.error("[v0] [API Client] Error deleting training record:", error)
      return false
    }
  }

  async getFulcrumInventory(): Promise<any> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Returning mock Fulcrum inventory")
      return MOCK_DATA.inventory
    }

    try {
      console.log("[v0] [API Client] Fetching Fulcrum inventory from:", `${this.baseUrl}/api/fulcrum/inventory`)
      const response = await fetch(`${this.baseUrl}/api/fulcrum/inventory`)
      if (!response.ok) {
        console.error("[v0] [API Client] Failed to fetch inventory, status:", response.status)
        throw new Error("Failed to get inventory")
      }
      const data = await response.json()
      console.log("[v0] [API Client] Received inventory data:", data.items?.length || 0, "items")
      return data
    } catch (error) {
      console.error("[v0] [API Client] Error getting Fulcrum inventory:", error)
      return { items: [], lastUpdated: new Date().toISOString(), error: "Failed to fetch inventory data" }
    }
  }

  async getFulcrumOperations(): Promise<any> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Returning mock Fulcrum operations")
      return MOCK_DATA.operations
    }

    try {
      console.log("[v0] [API Client] Fetching Fulcrum operations from:", `${this.baseUrl}/api/fulcrum/operations`)
      const response = await fetch(`${this.baseUrl}/api/fulcrum/operations`)
      if (!response.ok) {
        console.error("[v0] [API Client] Failed to fetch operations, status:", response.status)
        throw new Error("Failed to get operations")
      }
      const data = await response.json()
      console.log("[v0] [API Client] Received operations data:", data.operations?.length || 0, "operations")
      return data
    } catch (error) {
      console.error("[v0] [API Client] Error getting Fulcrum operations:", error)
      return { operations: [], lastUpdated: new Date().toISOString(), error: "Failed to fetch operations data" }
    }
  }

  async getFulcrumProduction(): Promise<any> {
    if (this.useMockData) {
      console.log("[v0] [API Client] Returning mock Fulcrum production")
      return MOCK_DATA.production
    }

    try {
      console.log("[v0] [API Client] Fetching Fulcrum production from:", `${this.baseUrl}/api/fulcrum/production`)
      const response = await fetch(`${this.baseUrl}/api/fulcrum/production`)
      if (!response.ok) {
        console.error("[v0] [API Client] Failed to fetch production, status:", response.status)
        throw new Error("Failed to get production")
      }
      const data = await response.json()
      console.log("[v0] [API Client] Received production data:", data.production?.length || 0, "work centers")
      return data
    } catch (error) {
      console.error("[v0] [API Client] Error getting Fulcrum production:", error)
      return {
        production: [],
        totalCompleted: 0,
        lastUpdated: new Date().toISOString(),
        error: "Failed to fetch production data",
      }
    }
  }

  setServerUrl(url: string) {
    this.baseUrl = url
    if (typeof window !== "undefined") {
      localStorage.setItem("integra_server_url", url)
    }
  }

  getServerUrl(): string {
    return this.baseUrl
  }
}

export const apiClient = new ApiClient()
