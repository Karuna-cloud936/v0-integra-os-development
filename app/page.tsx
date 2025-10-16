"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { IntegraHeader } from "@/components/integra/header"
import { AnnouncementTicker } from "@/components/integra/announcement-ticker"
import { WeatherWidget } from "@/components/integra/widgets/weather-widget"
import { ProductionWidget } from "@/components/integra/widgets/production-widget"
import { MachineStatusWidget } from "@/components/integra/widgets/machine-status-widget"
import { NoticeBoardWidget } from "@/components/integra/widgets/notice-board-widget"
import { InventoryWidget } from "@/components/integra/widgets/inventory-widget"
import { CommunicationApp } from "@/components/integra/communication-app"
import { ServerConfig } from "@/components/integra/server-config"
import { getDefaultState, type IntegraState, type App, type Notice, type LayoutItem } from "@/lib/integra-state"
import { apiClient } from "@/lib/api-client"
import { FulcrumTimeclock } from "@/components/integra/fulcrum-timeclock"

export default function IntegraOS() {
  // --- State Initialization ---
  // All hooks must be called at the top level, not inside try/catch or conditionals
  const [isPreviewMode, setIsPreviewMode] = useState(true)
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false)
  const [setupServerUrl, setSetupServerUrl] = useState("")
  const [setupDeviceName, setSetupDeviceName] = useState("")
  const [setupError, setSetupError] = useState("")
  const [testingConnection, setTestingConnection] = useState(false)

  const [state, setState] = useState<IntegraState>(() => {
    const defaultState = getDefaultState()
    defaultState.currentUser = defaultState.users.shop_floor
    return defaultState
  })
  const [isRotated, setIsRotated] = useState(false)
  const [openModal, setOpenModal] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<App | null>(null)
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [passcodeInput, setPasscodeInput] = useState("")
  const [passcodeError, setPasscodeError] = useState("")
  const [isEditingMainBoard, setIsEditingMainBoard] = useState(false)
  const [editingLayout, setEditingLayout] = useState<LayoutItem[]>([])
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null)
  const [touchDragState, setTouchDragState] = useState<{
    isDragging: boolean
    startX: number
    startY: number
    currentX: number
    currentY: number
    draggedElement: HTMLElement | null
  } | null>(null)

  const [serverConnected, setServerConnected] = useState(false)
  const [showServerConfig, setShowServerConfig] = useState(false)

  const [lastSyncedTimestamp, setLastSyncedTimestamp] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [showCustomAppForm, setShowCustomAppForm] = useState<"web" | "local" | null>(null)
  const [customAppForm, setCustomAppForm] = useState({
    name: "",
    url: "",
    icon: "fa-globe",
    description: "",
    type: "app" as "app" | "local",
  })

  const [newAnnouncement, setNewAnnouncement] = useState("")

  const [newNoticeForm, setNewNoticeForm] = useState({
    title: "",
    url: "",
  })

  const [uploadingPDF, setUploadingPDF] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [deviceRegistrationStatus, setDeviceRegistrationStatus] = useState<{
    isRegistered: boolean
    lastChecked: number | null
  }>({
    isRegistered: false,
    lastChecked: null,
  })

  // --- Training Module State ---
  const [employees, setEmployees] = useState<any[]>([])
  const [trainingRecords, setTrainingRecords] = useState<any[]>([])
  const [trainingView, setTrainingView] = useState<"documents" | "forms" | "employees" | "matrix">("documents")
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null)
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    name: "",
    department: "",
    position: "",
    hireDate: "",
  })
  const [selectedEmployeeForTraining, setSelectedEmployeeForTraining] = useState<string | null>(null)
  const [newTrainingRecordForm, setNewTrainingRecordForm] = useState({
    trainingId: "",
    trainingType: "document" as "document" | "form",
    completedDate: "",
    expiryDate: "",
    score: "",
    notes: "",
  })
  // --- End Training Module State ---

  // --- Environment Check ---
  const checkEnvironment = () => {
    setIsPreviewMode(true)
    console.log("[v0] Running in web browser mode with mock data")
  }

  // --- Initialization Effect ---
  useEffect(() => {
    const initializeApp = async () => {
      console.log("[v0] Initializing Integra OS...")
      console.log("[v0] Preview mode enabled")

      apiClient.useMockData = true
      const initialState = getDefaultState()
      initialState.currentUser = initialState.users.administrator
      setState(initialState)
      setServerConnected(false)
      setIsFirstTimeSetup(false)
    }

    // Only initialize if preview mode is defined to avoid running twice in dev mode
    if (isPreviewMode !== undefined) {
      initializeApp()
    }
  }, [isPreviewMode])

  useEffect(() => {
    checkEnvironment()
  }, [])

  // --- Training Data Load Effect ---
  useEffect(() => {
    if (openModal === "training" && serverConnected) {
      loadTrainingData()
    }
  }, [openModal, serverConnected])

  // --- Server Connection & State Loading ---
  const loadFromServer = async () => {
    const isConnected = await apiClient.healthCheck()
    setServerConnected(isConnected)

    if (isConnected) {
      const serverState = await apiClient.getState()
      if (serverState) {
        setState({
          ...serverState,
          currentUser: serverState.users.shop_floor, // Default to shop floor user
          editingLayoutForRole: null,
          pendingRoleChange: null,
        })
        setLastSyncedTimestamp(serverState.lastModified || 0)
      } else {
        // No state on server, use default and save it
        const initialState = getDefaultState()
        initialState.currentUser = initialState.users.shop_floor
        setState(initialState)

        const { currentUser, editingLayoutForRole, pendingRoleChange, ...syncedData } = initialState
        await apiClient.saveState(syncedData)
      }
    } else {
      // Not connected to server, use default state
      const initialState = getDefaultState()
      initialState.currentUser = initialState.users.shop_floor
      setState(initialState)
    }
  }

  // --- First Time Setup Handler ---
  const handleFirstTimeSetup = async () => {
    if (!setupServerUrl.trim()) {
      setSetupError("Please enter a server URL")
      return
    }

    if (!setupDeviceName.trim()) {
      setSetupError("Please enter a device name")
      return
    }

    setTestingConnection(true)
    setSetupError("")

    try {
      // Update API client with new URL
      apiClient.setServerUrl(setupServerUrl.trim())

      // Test connection
      const isConnected = await apiClient.healthCheck()

      if (isConnected) {
        const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

        console.log("[v0] [SETUP] Registering device:", { deviceId, deviceName: setupDeviceName.trim() })

        // Save device info locally
        localStorage.setItem("integra_device_id", deviceId)
        localStorage.setItem("integra_device_name", setupDeviceName.trim())

        console.log("[v0] [SETUP] Saved to localStorage:", {
          deviceId: localStorage.getItem("integra_device_id"),
          deviceName: localStorage.getItem("integra_device_name"),
        })

        // Register device with server
        const registerResult = await apiClient.registerDevice(deviceId, setupDeviceName.trim())
        console.log("[v0] [SETUP] Device registration result:", registerResult)

        // Mark setup as complete
        localStorage.setItem("integra_setup_complete", "true")
        setIsFirstTimeSetup(false)
        setServerConnected(true)

        // Load state from server
        await loadFromServer()
      } else {
        setSetupError("Could not connect to server. Please check the URL and try again.")
      }
    } catch (error) {
      console.error("[v0] [SETUP] Error during setup:", error)
      setSetupError("Failed to connect to server. Please check the URL and try again.")
    } finally {
      setTestingConnection(false)
    }
  }

  // --- Sync Polling Effect ---
  useEffect(() => {
    if (!serverConnected || !state) return

    console.log("[v0] Starting sync polling - current lastSyncedTimestamp:", lastSyncedTimestamp)

    // Poll for updates every 3 seconds
    syncIntervalRef.current = setInterval(async () => {
      if (isSyncing) {
        console.log("[v0] Skipping sync - already syncing")
        return
      }

      setIsSyncing(true)
      try {
        const serverState = await apiClient.getState()

        if (serverState && serverState.lastModified) {
          const deviceId = localStorage.getItem("integra_device_id")

          console.log("[v0] Sync check:", {
            serverTimestamp: serverState.lastModified,
            localTimestamp: lastSyncedTimestamp,
            serverDevice: serverState.modifiedBy,
            localDevice: deviceId,
            isNewer: serverState.lastModified > lastSyncedTimestamp,
            isDifferentDevice: serverState.modifiedBy !== deviceId,
          })

          if (serverState.lastModified > lastSyncedTimestamp && serverState.modifiedBy !== deviceId) {
            console.log("[v0] ✅ Syncing state from server - updated by:", serverState.modifiedBy)
            setState((prevState) => ({
              ...serverState,
              currentUser: prevState?.currentUser || serverState.users.shop_floor,
              editingLayoutForRole: prevState?.editingLayoutForRole || null,
              pendingRoleChange: prevState?.pendingRoleChange || null,
            }))
            setLastSyncedTimestamp(serverState.lastModified)
          } else if (serverState.lastModified > lastSyncedTimestamp) {
            console.log("[v0] ⏭️ Skipping sync - change was from this device")
          } else {
            console.log("[v0] ⏭️ Skipping sync - local state is up to date")
          }
        }
      } catch (error) {
        console.error("[v0] ❌ Error syncing state:", error)
      } finally {
        setIsSyncing(false)
      }
    }, 3000)

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [serverConnected, state, lastSyncedTimestamp, isSyncing])

  // --- Auto Save Effect ---
  useEffect(() => {
    // Debounce save by 500ms
    if (!state || !serverConnected) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      console.log("[v0] 💾 Saving state to server...")

      const { currentUser, editingLayoutForRole, pendingRoleChange, ...syncedData } = state

      const result = await apiClient.saveState(syncedData)
      if (result.success && result.lastModified) {
        setLastSyncedTimestamp(result.lastModified)
        console.log("[v0] ✅ State saved successfully at:", new Date(result.lastModified).toLocaleTimeString())
      } else {
        console.error("[v0] ❌ Failed to save state:", result)
      }
    }, 500)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [state, serverConnected])

  // --- Device Registration Check Effect ---
  useEffect(() => {
    const checkDeviceRegistration = async () => {
      const deviceId = localStorage.getItem("integra_device_id")
      if (!deviceId || !serverConnected) return

      try {
        const devices = await apiClient.getDevices()
        const isRegistered = devices.some((d: any) => d.deviceId === deviceId)

        console.log("[v0] [DEVICE CHECK] Device registration status:", {
          deviceId,
          isRegistered,
          totalDevices: devices.length,
        })

        setDeviceRegistrationStatus({
          isRegistered,
          lastChecked: Date.now(),
        })
      } catch (error) {
        console.error("[v0] [DEVICE CHECK] Error checking device registration:", error)
        // Consider setting an error state or defaulting to 'not registered' if check fails
        setDeviceRegistrationStatus({
          isRegistered: false,
          lastChecked: Date.now(),
        })
      }
    }

    if (serverConnected) {
      checkDeviceRegistration()
    }
  }, [serverConnected])

  // --- Device Re-registration Handler ---
  const handleReRegisterDevice = async () => {
    const deviceId = localStorage.getItem("integra_device_id")
    const deviceName = localStorage.getItem("integra_device_name")

    if (!deviceId || !deviceName) {
      alert("Device information not found. Please complete setup again.")
      localStorage.removeItem("integra_setup_complete")
      window.location.reload()
      return
    }

    console.log("[v0] [RE-REGISTER] Re-registering device:", { deviceId, deviceName })

    try {
      const result = await apiClient.registerDevice(deviceId, deviceName)
      console.log("[v0] [RE-REGISTER] Registration result:", result)

      if (result) {
        setDeviceRegistrationStatus({
          isRegistered: true,
          lastChecked: Date.now(),
        })
        alert("Device re-registered successfully!")
      } else {
        alert("Failed to re-register device. Please check server connection.")
      }
    } catch (error) {
      console.error("[v0] [RE-REGISTER] Error during re-registration:", error)
      alert("An error occurred during re-registration. Please check console and server connection.")
    }
  }

  // --- Training Module Functions ---
  const loadTrainingData = async () => {
    try {
      const [employeesData, recordsData] = await Promise.all([apiClient.getEmployees(), apiClient.getTrainingRecords()])
      setEmployees(employeesData)
      setTrainingRecords(recordsData)
    } catch (error) {
      console.error("[v0] [Training] Error loading data:", error)
      alert("Failed to load training data. Please check console.")
    }
  }

  const canAddEmployees = state?.currentUser?.role === "administrator"
  const canManageTraining = state?.currentUser?.role === "administrator" || state?.currentUser?.role === "manager"

  const handleAddEmployee = async () => {
    if (!canAddEmployees) {
      alert("Only administrators can add employees")
      return
    }

    console.log("[v0] [Training] Adding employee:", newEmployeeForm)

    if (
      !newEmployeeForm.name ||
      !newEmployeeForm.department ||
      !newEmployeeForm.position ||
      !newEmployeeForm.hireDate
    ) {
      alert("Please fill in all required fields")
      return
    }

    const newEmployee = {
      id: `emp_${Date.now()}`,
      ...newEmployeeForm,
      createdAt: Date.now(),
    }

    console.log("[v0] [Training] Calling createEmployee API...")
    try {
      const success = await apiClient.createEmployee(newEmployee)
      console.log("[v0] [Training] Create employee result:", success)

      if (success) {
        console.log("[v0] [Training] Employee created, reloading data...")
        await loadTrainingData()
        setNewEmployeeForm({ name: "", department: "", position: "", hireDate: "" })
        alert("Employee added successfully!")
      } else {
        alert("Failed to add employee")
      }
    } catch (error) {
      console.error("[v0] [Training] Error adding employee:", error)
      alert("An error occurred while adding the employee. Please check console.")
    }
  }

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return

    try {
      const success = await apiClient.updateEmployee(editingEmployee.id, {
        name: editingEmployee.name,
        department: editingEmployee.department,
        position: editingEmployee.position,
        hireDate: editingEmployee.hireDate,
      })

      if (success) {
        await loadTrainingData()
        setEditingEmployee(null)
        alert("Employee updated successfully!")
      } else {
        alert("Failed to update employee")
      }
    } catch (error) {
      console.error("[v0] [Training] Error updating employee:", error)
      alert("An error occurred while updating the employee. Please check console.")
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee? All training records will also be deleted.")) return

    try {
      const success = await apiClient.deleteEmployee(id)
      if (success) {
        await loadTrainingData()
        alert("Employee deleted successfully!")
      } else {
        alert("Failed to delete employee")
      }
    } catch (error) {
      console.error("[v0] [Training] Error deleting employee:", error)
      alert("An error occurred while deleting the employee. Please check console.")
    }
  }

  const handleAddTrainingRecord = async () => {
    if (!canManageTraining) {
      alert("Only administrators and managers can add training records")
      return
    }

    console.log("[v0] [Training] Adding training record:", newTrainingRecordForm)

    if (!selectedEmployeeForTraining || !newTrainingRecordForm.trainingId || !newTrainingRecordForm.completedDate) {
      alert("Please fill in all required fields (Training and Completed Date)")
      return
    }

    const newRecord = {
      id: `tr_${Date.now()}`,
      employeeId: selectedEmployeeForTraining,
      ...newTrainingRecordForm,
      score: newTrainingRecordForm.score ? Number.parseInt(newTrainingRecordForm.score) : null,
    }

    console.log("[v0] [Training] Calling createTrainingRecord API...")
    try {
      const success = await apiClient.createTrainingRecord(newRecord)
      console.log("[v0] [Training] Create training record result:", success)

      if (success) {
        console.log("[v0] [Training] Training record created, reloading data...")
        await loadTrainingData()
        setSelectedEmployeeForTraining(null)
        setNewTrainingRecordForm({
          trainingId: "",
          trainingType: "document",
          completedDate: "",
          expiryDate: "",
          score: "",
          notes: "",
        })
        alert("Training record added successfully!")
      } else {
        alert("Failed to add training record")
      }
    } catch (error) {
      console.error("[v0] [Training] Error adding training record:", error)
      alert("An error occurred while adding the training record. Please check console.")
    }
  }

  const handleDeleteTrainingRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this training record?")) return

    try {
      const success = await apiClient.deleteTrainingRecord(id)
      if (success) {
        await loadTrainingData()
        alert("Training record deleted successfully!")
      } else {
        alert("Failed to delete training record")
      }
    } catch (error) {
      console.error("[v0] [Training] Error deleting training record:", error)
      alert("An error occurred while deleting the training record. Please check console.")
    }
  }

  const getEmployeeTrainingStatus = (employeeId: string, trainingId: string) => {
    return trainingRecords.find((r) => r.employeeId === employeeId && r.trainingId === trainingId)
  }

  const getAllTrainings = () => {
    return [
      ...state.training.documents.map((d) => ({ ...d, type: "document" as const })),
      ...state.training.forms.map((f) => ({ ...f, type: "form" as const })),
    ]
  }
  // --- End Training Module Functions ---

  // --- Initial Render Logic ---
  if (isFirstTimeSetup) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background p-4">
        <div className="bg-popover border border-border rounded-2xl shadow-2xl w-full max-w-lg p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-server text-primary text-4xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome to Integra OS</h2>
            <p className="text-muted-foreground">Set up your device by entering the server address and a device name</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Server URL <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={setupServerUrl}
                onChange={(e) => {
                  setSetupServerUrl(e.target.value)
                  setSetupError("")
                }}
                placeholder="http://192.168.1.100:3001"
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg"
                disabled={testingConnection}
              />
              <p className="text-xs text-muted-foreground mt-2">
                <i className="fas fa-info-circle mr-1"></i>
                Enter the IP address and port of the server
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Device Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={setupDeviceName}
                onChange={(e) => {
                  setSetupDeviceName(e.target.value)
                  setSetupError("")
                }}
                onKeyDown={(e) => e.key === "Enter" && handleFirstTimeSetup()}
                placeholder="e.g., Shop Floor Tablet 1"
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg"
                autoFocus
                disabled={testingConnection}
              />
              <p className="text-xs text-muted-foreground mt-2">
                <i className="fas fa-info-circle mr-1"></i>
                Give this device a unique name to identify it
              </p>
            </div>

            {setupError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-start gap-2">
                <i className="fas fa-exclamation-triangle mt-0.5"></i>
                <span>{setupError}</span>
              </div>
            )}

            <button
              onClick={handleFirstTimeSetup}
              disabled={testingConnection || !setupServerUrl.trim() || !setupDeviceName.trim()}
              className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingConnection ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Connecting...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle mr-2"></i>
                  Connect to Server
                </>
              )}
            </button>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                This configuration will be saved and you won't need to enter it again on this device.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state if state or currentUser is not yet available
  if (!state || !state.currentUser) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="text-foreground text-2xl">Loading Integra OS...</div>
          {!serverConnected && (
            <button
              onClick={() => setShowServerConfig(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <i className="fas fa-server mr-2"></i>
              Configure Server
            </button>
          )}
        </div>
      </div>
    )
  }

  // Determine user roles and layout editing status
  const canManage = state?.currentUser?.role === "administrator" || state?.currentUser?.role === "manager"
  const isAdmin = state?.currentUser?.role === "administrator"
  const roleForLayout = state.editingLayoutForRole || state?.currentUser?.role || "shop_floor"
  const layoutItems = isEditingMainBoard ? editingLayout : state.layouts[roleForLayout] || []

  // --- User/Role Change Handlers ---
  const handleUserChange = (role: string) => {
    const targetUser = state.users[role]
    if (targetUser.passcode) {
      setState({ ...state, pendingRoleChange: role })
      setOpenModal("passcode")
    } else {
      setState({ ...state, currentUser: targetUser, editingLayoutForRole: null })
      setIsEditingMainBoard(false)
    }
  }

  const handlePasscodeSubmit = () => {
    if (!state.pendingRoleChange) return

    const targetUser = state.users[state.pendingRoleChange]
    if (passcodeInput === targetUser.passcode) {
      setState({ ...state, currentUser: targetUser, pendingRoleChange: null, editingLayoutForRole: null })
      setOpenModal(null)
      setPasscodeInput("")
      setPasscodeError("")
      setIsEditingMainBoard(false)
    } else {
      setPasscodeError("Incorrect passcode. Please try again.")
      setPasscodeInput("")
    }
  }

  const handlePasscodeCancel = () => {
    setState({ ...state, pendingRoleChange: null })
    setOpenModal(null)
    setPasscodeInput("")
    setPasscodeError("")
  }

  // --- App/Notice Click Handlers ---
  const handleAppClick = (app: App) => {
    if (isEditingMainBoard) return
    if (app.type === "widget") return // Widgets are not clickable apps

    if (app.id.startsWith("custom_")) {
      window.open(app.url, "_blank") // Open custom web apps in a new tab
      return
    }

    setSelectedApp(app)
    setOpenModal(app.modalId || "app") // Use modalId if defined, else default to 'app'
  }

  const handleNoticeClick = (notice: Notice) => {
    setSelectedNotice(notice)
    setOpenModal("notice-pdf")
  }

  // --- Notice Management Handlers ---
  const handleAddNotice = async () => {
    if (!newNoticeForm.title.trim() || !selectedFile) {
      alert("Please provide a title and select a PDF file")
      return
    }

    setUploadingPDF(true)

    try {
      const pdfUrl = await apiClient.uploadPdf(selectedFile)
      if (!pdfUrl) {
        throw new Error("Upload failed: PDF URL not received.")
      }

      const newNotice: Notice = {
        id: `notice_${Date.now()}`,
        title: newNoticeForm.title.trim(),
        url: pdfUrl,
        pinned: false,
      }

      setState((prevState) => ({
        ...prevState,
        noticeBoardItems: [...prevState.noticeBoardItems, newNotice],
      }))

      setNewNoticeForm({ title: "", url: "" })
      setSelectedFile(null)
      alert("Notice added successfully!")
    } catch (error) {
      console.error("Error uploading PDF:", error)
      alert("Failed to upload PDF. Please try again.")
    } finally {
      setUploadingPDF(false)
    }
  }

  const handleRemoveNotice = async (noticeId: string) => {
    if (!confirm("Are you sure you want to remove this notice?")) return

    const notice = state.noticeBoardItems.find((n) => n.id === noticeId)
    if (!notice) return

    try {
      // Attempt to delete the PDF file from storage if possible
      if (notice.url) {
        await apiClient.deletePdf(notice.url)
      }

      setState((prevState) => ({
        ...prevState,
        noticeBoardItems: prevState.noticeBoardItems.filter((n) => n.id !== noticeId),
      }))
      alert("Notice removed successfully.")
    } catch (error) {
      console.error("Error deleting PDF or notice:", error)
      // If deletion fails, still remove from UI to prevent inconsistencies
      setState((prevState) => ({
        ...prevState,
        noticeBoardItems: prevState.noticeBoardItems.filter((n) => n.id !== noticeId),
      }))
      alert("Failed to delete PDF from storage, but notice removed from list.")
    }
  }

  const handleTogglePin = (noticeId: string) => {
    const notice = state.noticeBoardItems.find((n) => n.id === noticeId)
    if (!notice) return

    // Check if we're trying to pin and already have 4 pinned
    const pinnedCount = state.noticeBoardItems.filter((n) => n.pinned).length
    if (!notice.pinned && pinnedCount >= 4) {
      alert("You can only pin up to 4 notices at a time. Unpin another notice first.")
      return
    }

    setState((prevState) => ({
      ...prevState,
      noticeBoardItems: prevState.noticeBoardItems.map((n) => (n.id === noticeId ? { ...n, pinned: !n.pinned } : n)),
    }))
  }

  // --- Layout Editor Handlers ---
  const handleOpenLayoutEditor = () => {
    const roleToEdit = state?.currentUser?.role || "shop_floor"
    setState((prevState) => ({ ...prevState, editingLayoutForRole: roleToEdit }))
    const currentLayout = state.layouts[roleToEdit] || []
    setEditingLayout(JSON.parse(JSON.stringify(currentLayout))) // Deep copy
    setIsEditingMainBoard(true)
  }

  const handleSwitchEditingRole = (role: string) => {
    setState((prevState) => ({ ...prevState, editingLayoutForRole: role }))
    const newLayout = state.layouts[role] || []
    setEditingLayout(JSON.parse(JSON.stringify(newLayout))) // Deep copy
  }

  const handleSaveLayout = () => {
    const roleToEdit = state.editingLayoutForRole || state?.currentUser?.role || "shop_floor"
    setState((prevState) => ({
      ...prevState,
      layouts: {
        ...prevState.layouts,
        [roleToEdit]: editingLayout,
      },
      editingLayoutForRole: null, // Clear editingLayoutForRole after saving
    }))
    setIsEditingMainBoard(false)
    setEditingLayout([])
    setDraggedItemId(null) // Clear drag state
    setDraggedOverIndex(null)
    setTouchDragState(null)
  }

  const handleCancelLayoutEdit = () => {
    setState((prevState) => ({ ...prevState, editingLayoutForRole: null })) // Clear editingLayoutForRole on cancel
    setIsEditingMainBoard(false)
    setEditingLayout([])
    setDraggedItemId(null)
    setDraggedOverIndex(null)
    setTouchDragState(null) // Clear touch drag state
  }

  const handleCleanupLayout = () => {
    if (!confirm("This will remove duplicate and invalid items from the layout. Continue?")) return

    const seen = new Set<string>()
    const cleaned = editingLayout.filter((item) => {
      // Check if item exists in available apps
      const appExists = state.allAvailableApps.some((app) => app.id === item.id)
      if (!appExists) return false

      // Check for duplicates
      if (seen.has(item.id)) return false
      seen.add(item.id)

      return true
    })

    setEditingLayout(cleaned)
    alert(`Cleaned up ${editingLayout.length - cleaned.length} invalid/duplicate items`)
  }

  const handleResetLayout = () => {
    if (!confirm("This will reset the layout to default settings. All customizations will be lost. Continue?")) return

    const roleToEdit = state.editingLayoutForRole || state?.currentUser?.role || "shop_floor"
    const defaultLayout = state.allAvailableApps
      .filter((app) => app.roles.includes(roleToEdit))
      .map((app) => ({
        id: app.id,
        size: app.type === "widget" ? { col: 2, row: 2 } : { col: 1, row: 1 },
      }))

    setEditingLayout(defaultLayout)
    alert("Layout reset to defaults")
  }

  // --- Drag and Drop Handlers ---
  const handleMainBoardDragStart = (itemId: string, e?: React.DragEvent | React.TouchEvent) => {
    setDraggedItemId(itemId)
    // If it's a touch event, handle it in handleTouchStart
    if (e && "touches" in e) {
      handleTouchStart(itemId, e as React.TouchEvent)
    }
    // For mouse events, we might want to add visual feedback here if needed,
    // but the current implementation relies on opacity/scale changes in the rendered item.
  }

  const handleTouchStart = (itemId: string, e: React.TouchEvent) => {
    if (!isEditingMainBoard) return

    const touch = e.touches[0]
    const element = e.currentTarget as HTMLElement

    setDraggedItemId(itemId)
    setTouchDragState({
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      draggedElement: element,
    })

    // Add visual feedback
    element.style.opacity = "0.5"
    element.style.transform = "scale(0.95)"
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragState?.isDragging) return

    e.preventDefault() // Prevent scrolling while dragging

    const touch = e.touches[0]
    setTouchDragState({
      ...touchDragState,
      currentX: touch.clientX,
      currentY: touch.clientY,
    })

    // Find which element we're over
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
    const layoutItem = elementBelow?.closest("[data-layout-index]")

    if (layoutItem) {
      const index = Number.parseInt(layoutItem.getAttribute("data-layout-index") || "-1")
      if (index >= 0 && index !== editingLayout.findIndex((item) => item.id === draggedItemId)) {
        // Don't drag over itself
        setDraggedOverIndex(index)
      }
    } else {
      // If not over a layout item, reset draggedOverIndex
      setDraggedOverIndex(null)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDragState?.isDragging || draggedItemId === null) return

    // Reset visual feedback
    if (touchDragState.draggedElement) {
      touchDragState.draggedElement.style.opacity = ""
      touchDragState.draggedElement.style.transform = ""
    }

    // Perform the drop if we're over a valid target
    if (draggedOverIndex !== null) {
      const draggedIndex = editingLayout.findIndex((item) => item.id === draggedItemId)
      if (draggedIndex !== -1) {
        const newLayout = [...editingLayout]
        const [draggedItem] = newLayout.splice(draggedIndex, 1)
        newLayout.splice(draggedOverIndex, 0, draggedItem)
        setEditingLayout(newLayout)
      }
    }

    // Clean up state
    setTouchDragState(null)
    setDraggedItemId(null)
    setDraggedOverIndex(null)
  }

  const handleMainBoardDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedItemId && draggedItemId !== editingLayout[index]?.id) {
      setDraggedOverIndex(index)
    }
  }

  const handleMainBoardDragLeave = () => {
    // Consider resetting if mouse leaves the entire grid, or just the specific item.
    // For now, we'll rely on dragOver to update.
    // setDraggedOverIndex(null);
  }

  const handleMainBoardDrop = (targetIndex: number) => {
    if (draggedItemId === null) return

    const draggedIndex = editingLayout.findIndex((item) => item.id === draggedItemId)
    if (draggedIndex === -1) return // Item not found

    const newLayout = [...editingLayout]
    const [draggedItem] = newLayout.splice(draggedIndex, 1)
    newLayout.splice(targetIndex, 0, draggedItem)

    setEditingLayout(newLayout)
    setDraggedItemId(null)
    setDraggedOverIndex(null)
  }

  const handleMainBoardDragEnd = () => {
    // Cleanup for mouse drag events
    setDraggedItemId(null)
    setDraggedOverIndex(null)
  }

  // --- Size/Layout Manipulation Handlers ---
  const handleChangeSize = (itemId: string, dimension: "col" | "row", delta: number) => {
    setEditingLayout((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const currentSize = item.size[dimension]
          const newSize = Math.max(1, Math.min(4, currentSize + delta)) // Limit to 1-4 columns/rows
          return {
            ...item,
            size: { ...item.size, [dimension]: newSize },
          }
        }
        return item
      }),
    )
  }

  const handleSetPresetSize = (itemId: string, preset: "small" | "medium" | "large" | "xlarge") => {
    const presetSizes = {
      small: { col: 1, row: 1 },
      medium: { col: 2, row: 2 },
      large: { col: 3, row: 2 },
      xlarge: { col: 4, row: 3 },
    }

    setEditingLayout((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            size: presetSizes[preset],
          }
        }
        return item
      }),
    )
  }

  const handleAddToLayout = (appId: string) => {
    const app = state.allAvailableApps.find((a) => a.id === appId)
    if (!app) return

    const alreadyInLayout = editingLayout.some((item) => item.id === appId)
    if (alreadyInLayout) {
      alert(`"${app.name}" is already in the layout.`)
      return
    }

    setEditingLayout((prev) => [
      ...prev,
      {
        id: appId,
        size: app.type === "widget" ? { col: 2, row: 2 } : { col: 1, row: 1 },
      },
    ])
  }

  const handleRemoveFromLayout = (itemId: string) => {
    setEditingLayout((prev) => prev.filter((item) => item.id !== itemId))
  }

  // --- Custom App Creation/Deletion Handerlers ---
  const handleCreateCustomApp = () => {
    if (!customAppForm.name || !customAppForm.url) {
      alert("Please fill in all required fields (Name and URL/Path)")
      return
    }

    const newApp: App = {
      id: `custom_${Date.now()}`,
      name: customAppForm.name.trim(),
      icon: customAppForm.icon.trim() || "fa-globe", // Default icon if empty
      url: customAppForm.url.trim(),
      description: customAppForm.description.trim(),
      roles: ["administrator", "manager", "shop_floor"], // Default roles for custom apps
      type: customAppForm.type,
      modalId: "app", // Custom apps open in iframe modal
      isCustom: true,
    }

    setState((prevState) => ({
      ...prevState,
      allAvailableApps: [...prevState.allAvailableApps, newApp],
    }))

    // Reset form and close custom app form
    setCustomAppForm({
      name: "",
      url: "",
      icon: "fa-globe",
      description: "",
      type: "app", // Reset to default type
    })
    setShowCustomAppForm(null)
    alert(`Custom app "${newApp.name}" created successfully!`)
  }

  const handleDeleteCustomApp = (appId: string) => {
    if (!confirm("Are you sure you want to delete this custom app? This action cannot be undone.")) return

    // Remove from allAvailableApps
    setState((prevState) => ({
      ...prevState,
      allAvailableApps: prevState.allAvailableApps.filter((app) => app.id !== appId),
      // Also remove from all layouts to prevent broken entries
      layouts: Object.fromEntries(
        Object.entries(prevState.layouts).map(([role, layout]) => [role, layout.filter((item) => item.id !== appId)]),
      ),
    }))
    alert("Custom app deleted successfully.")
  }

  // --- Announcement Management Handlers ---
  const handleAddAnnouncement = () => {
    if (!newAnnouncement.trim()) return
    setState((prevState) => ({
      ...prevState,
      announcements: [...prevState.announcements, newAnnouncement.trim()],
    }))
    setNewAnnouncement("")
  }

  const handleRemoveAnnouncement = (index: number) => {
    setState((prevState) => ({
      ...prevState,
      announcements: prevState.announcements.filter((_, i) => i !== index),
    }))
  }

  // --- Widget Rendering ---
  const renderWidget = (app: App) => {
    switch (app.id) {
      case "weather_widget":
        return <WeatherWidget iconColor={state.config.iconColor} />
      case "prod_widget":
        return <ProductionWidget iconColor={state.config.iconColor} />
      case "machine_status_widget":
        return <MachineStatusWidget iconColor={state.config.iconColor} />
      case "inventory_widget":
        return <InventoryWidget iconColor={state.config.iconColor} />
      case "notice_widget":
        return (
          <NoticeBoardWidget
            iconColor={state.config.iconColor}
            notices={state.noticeBoardItems}
            onNoticeClick={handleNoticeClick}
            onManageClick={() => setOpenModal("notice-management")}
            canManage={canManage}
          />
        )
      default:
        // Render a generic widget placeholder or error if ID is unknown
        console.warn(`[v0] Unknown widget ID: ${app.id}`)
        return (
          <div className="p-4 text-destructive">
            <i className="fas fa-exclamation-triangle mr-2"></i> Unknown Widget
          </div>
        )
    }
  }

  // --- App Tile Rendering ---
  const renderAppTile = (layoutItem: LayoutItem, index: number) => {
    const app = state.allAvailableApps.find((a) => a.id === layoutItem.id)
    if (!app) return null // Should not happen if layout is consistent with allAvailableApps

    const colSpan = `col-span-${layoutItem.size.col}`
    const rowSpan = `row-span-${layoutItem.size.row}`
    const isDragging = draggedItemId === layoutItem.id
    const isDraggedOver = draggedOverIndex === index

    // Determine hover/drag feedback classes
    const dragFeedbackClass = isEditingMainBoard
      ? `cursor-move touch-none ${isDragging ? "opacity-50 scale-95" : ""} ${isDraggedOver ? "ring-4 ring-primary" : ""}`
      : "cursor-pointer hover:shadow-xl hover:-translate-y-1"

    const commonClasses = `relative ${colSpan} ${rowSpan} rounded-2xl border ${state.config.tileColor} border-border overflow-hidden shadow-sm transition-all duration-300`

    // Render Widgets differently from Apps
    if (app.type === "widget") {
      return (
        <div
          key={app.id}
          data-layout-index={index}
          draggable={isEditingMainBoard}
          onDragStart={(e) => isEditingMainBoard && handleMainBoardDragStart(layoutItem.id, e)}
          onDragOver={(e) => isEditingMainBoard && handleMainBoardDragOver(e, index)}
          onDragLeave={handleMainBoardDragLeave} // Optional: may need more complex logic
          onDrop={(e) => {
            e.preventDefault() // Ensure drop event is handled
            isEditingMainBoard && handleMainBoardDrop(index)
          }}
          onDragEnd={handleMainBoardDragEnd}
          onTouchStart={(e) => isEditingMainBoard && handleTouchStart(layoutItem.id, e)}
          onTouchMove={(e) => isEditingMainBoard && handleTouchMove(e)}
          onTouchEnd={(e) => isEditingMainBoard && handleTouchEnd(e)}
          className={`${commonClasses} ${dragFeedbackClass}`}
        >
          {renderWidget(app)}
          {isEditingMainBoard && (
            <div className="absolute top-3 right-3 flex flex-col gap-3 bg-popover/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-border z-10">
              {/* Preset size buttons */}
              <div className="flex gap-2 pb-2 border-b border-border">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSetPresetSize(layoutItem.id, "small")
                  }}
                  className="touch-target touch-feedback w-8 h-8 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors"
                  title="Small (1x1)"
                >
                  S
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSetPresetSize(layoutItem.id, "medium")
                  }}
                  className="touch-target touch-feedback w-8 h-8 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors"
                  title="Medium (2x2)"
                >
                  M
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSetPresetSize(layoutItem.id, "large")
                  }}
                  className="touch-target touch-feedback w-8 h-8 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors"
                  title="Large (3x2)"
                >
                  L
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSetPresetSize(layoutItem.id, "xlarge")
                  }}
                  className="touch-target touch-feedback w-8 h-8 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors"
                  title="X-Large (4x3)"
                >
                  XL
                </button>
              </div>

              {/* Fine-tune controls */}
              <div className="flex gap-2">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleChangeSize(layoutItem.id, "col", -1)
                    }}
                    className="touch-target touch-feedback w-10 h-10 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Decrease width"
                    disabled={layoutItem.size.col <= 1}
                  >
                    W-
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleChangeSize(layoutItem.id, "col", 1)
                    }}
                    className="touch-target touch-feedback w-10 h-10 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Increase width"
                    disabled={layoutItem.size.col >= 4}
                  >
                    W+
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleChangeSize(layoutItem.id, "row", -1)
                    }}
                    className="touch-target touch-feedback w-10 h-10 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Decrease height"
                    disabled={layoutItem.size.row <= 1}
                  >
                    H-
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleChangeSize(layoutItem.id, "row", 1)
                    }}
                    className="touch-target touch-feedback w-10 h-10 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Increase height"
                    disabled={layoutItem.size.row >= 4}
                  >
                    H+
                  </button>
                </div>
              </div>

              {/* Current size display */}
              <div className="text-xs text-center text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1">
                {layoutItem.size.col}×{layoutItem.size.row}
              </div>

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Remove "${app.name}" from layout?`)) {
                    handleRemoveFromLayout(layoutItem.id)
                  }
                }}
                className="touch-target touch-feedback w-full h-10 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive hover:text-destructive-foreground text-sm font-bold transition-colors"
                title="Remove from layout"
              >
                <i className="fas fa-trash mr-2"></i>Remove
              </button>
            </div>
          )}
        </div>
      )
    }

    // Render App Tiles
    return (
      <div
        key={app.id}
        data-layout-index={index}
        draggable={isEditingMainBoard}
        onDragStart={(e) => isEditingMainBoard && handleMainBoardDragStart(layoutItem.id, e)}
        onDragOver={(e) => isEditingMainBoard && handleMainBoardDragOver(e, index)}
        onDragLeave={handleMainBoardDragLeave} // Optional: complex logic needed if used
        onDrop={(e) => {
          e.preventDefault() // Ensure drop event is handled
          isEditingMainBoard && handleMainBoardDrop(index)
        }}
        onDragEnd={handleMainBoardDragEnd}
        onTouchStart={(e) => isEditingMainBoard && handleTouchStart(layoutItem.id, e)}
        onTouchMove={(e) => isEditingMainBoard && handleTouchMove(e)}
        onTouchEnd={(e) => isEditingMainBoard && handleTouchEnd(e)}
        onClick={() => !isEditingMainBoard && handleAppClick(app)}
        className={`${commonClasses} ${dragFeedbackClass}`}
      >
        <div className="h-full p-4 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <i className={`fas ${app.icon || "fa-globe"} ${state.config.iconColor} text-2xl`}></i>
          </div>
          <span className="font-semibold text-sm text-foreground leading-tight line-clamp-2 px-1">{app.name}</span>
        </div>
        {isEditingMainBoard && (
          <div className="absolute top-3 right-3 flex flex-col gap-3 bg-popover/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-border z-10">
            {/* Preset size buttons */}
            <div className="flex gap-2 pb-2 border-b border-border">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSetPresetSize(layoutItem.id, "small")
                }}
                className="touch-target touch-feedback w-8 h-8 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors"
                title="Small (1x1)"
              >
                S
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSetPresetSize(layoutItem.id, "medium")
                }}
                className="touch-target touch-feedback w-8 h-8 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors"
                title="Medium (2x2)"
              >
                M
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSetPresetSize(layoutItem.id, "large")
                }}
                className="touch-target touch-feedback w-8 h-8 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors"
                title="Large (3x2)"
              >
                L
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSetPresetSize(layoutItem.id, "xlarge")
                }}
                className="touch-target touch-feedback w-8 h-8 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors"
                title="X-Large (4x3)"
              >
                XL
              </button>
            </div>

            {/* Fine-tune controls */}
            <div className="flex gap-2">
              <div className="flex flex-col gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleChangeSize(layoutItem.id, "col", -1)
                  }}
                  className="touch-target touch-feedback w-10 h-10 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Decrease width"
                  disabled={layoutItem.size.col <= 1}
                >
                  W-
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleChangeSize(layoutItem.id, "col", 1)
                  }}
                  className="touch-target touch-feedback w-10 h-10 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Increase width"
                  disabled={layoutItem.size.col >= 4}
                >
                  W+
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleChangeSize(layoutItem.id, "row", -1)
                  }}
                  className="touch-target touch-feedback w-10 h-10 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Decrease height"
                  disabled={layoutItem.size.row <= 1}
                >
                  H-
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleChangeSize(layoutItem.id, "row", 1)
                  }}
                  className="touch-target touch-feedback w-10 h-10 bg-muted rounded-lg hover:bg-primary hover:text-primary-foreground text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Increase height"
                  disabled={layoutItem.size.row >= 4}
                >
                  H+
                </button>
              </div>
            </div>

            {/* Current size display */}
            <div className="text-xs text-center text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1">
              {layoutItem.size.col}×{layoutItem.size.row}
            </div>

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Remove "${app.name}" from layout?`)) {
                  handleRemoveFromLayout(layoutItem.id)
                }
              }}
              className="touch-target touch-feedback w-full h-10 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive hover:text-destructive-foreground text-sm font-bold transition-colors"
              title="Remove from layout"
            >
              <i className="fas fa-trash mr-2"></i>Remove
            </button>
          </div>
        )}
      </div>
    )
  }

  // --- Main Application Layout ---
  return (
    <div
      className={`${state.config.backgroundColor} h-screen overflow-hidden flex flex-col ${isRotated ? "screen-rotated" : ""}`}
    >
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-2 text-center text-sm font-medium">
          Preview Mode - Using Mock Data
        </div>
      )}

      {/* Connection Status and Registration Info */}
      <div className="absolute top-2 right-2 z-50 flex items-center gap-2">
        <button
          onClick={() => setShowServerConfig(true)}
          className="px-3 py-1.5 bg-popover border border-border rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-muted transition-colors"
          title="Server configuration"
        >
          <i className={`fas fa-circle text-xs ${serverConnected ? "text-green-500" : "text-red-500"}`}></i>
          <span className="text-foreground">{serverConnected ? "Connected" : "Offline"}</span>
          {isSyncing && <i className="fas fa-sync fa-spin text-xs text-primary"></i>}
        </button>
        {serverConnected && (
          <button
            onClick={handleReRegisterDevice}
            className={`px-3 py-1.5 bg-popover border rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-muted transition-colors ${
              deviceRegistrationStatus.isRegistered ? "border-green-500/30" : "border-yellow-500/30"
            }`}
            title={
              deviceRegistrationStatus.isRegistered
                ? "Device is registered. Click to re-register."
                : "Device not found in registry. Click to register."
            }
          >
            <i
              className={`fas fa-id-card text-xs ${deviceRegistrationStatus.isRegistered ? "text-green-500" : "text-yellow-500"}`}
            ></i>
            <span className="text-foreground">
              {deviceRegistrationStatus.isRegistered ? "Registered" : "Not Registered"}
            </span>
          </button>
        )}
      </div>

      {/* Header Component */}
      <IntegraHeader
        currentUser={state.currentUser}
        users={state.users}
        onUserChange={handleUserChange}
        onOpenTimeClock={() => setOpenModal("timeclock")}
        onOpenSettings={() => setOpenModal("settings")}
        onOpenAddApp={() => setOpenModal("app-store")}
        onOpenEditLayout={handleOpenLayoutEditor}
        onRotateScreen={() => setIsRotated(!isRotated)}
        isRotated={isRotated}
        canManage={canManage}
        isAdmin={isAdmin}
      />

      {/* Announcement Ticker */}
      <AnnouncementTicker
        announcements={state.announcements}
        onEdit={() => setOpenModal("announcements")}
        canManage={canManage}
      />

      {/* Main Content Area */}
      <main className="flex-grow p-8 sm:p-10 lg:p-14 overflow-y-auto">
        <div className="flex justify-between items-start mb-10">
          <div className="flex-1">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-3">
              {isEditingMainBoard ? (
                <span className="flex items-center gap-4">
                  <i className="fas fa-edit text-primary"></i>
                  Editing Layout:{" "}
                  {state.users[state.editingLayoutForRole || state?.currentUser?.role || "shop_floor"]?.name}
                </span>
              ) : (
                state.config.appLibraryTitle
              )}
            </h2>
            <p className="text-lg text-muted-foreground">
              {isEditingMainBoard
                ? "Drag apps to reorder, use controls to resize, then save your changes"
                : state.config.appLibrarySubtitle}
            </p>

            {/* Layout Editing Role Selection */}
            {isEditingMainBoard && canManage && (
              <div className="mt-6 flex items-center gap-4 flex-wrap">
                <span className="text-base font-semibold text-foreground">Editing layout for:</span>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => handleSwitchEditingRole("administrator")}
                    className={`touch-target touch-feedback px-6 py-3 rounded-xl font-semibold text-base transition-all ${
                      state.editingLayoutForRole === "administrator"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-card text-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    <i className="fas fa-user-shield mr-2"></i>Administrator
                  </button>
                  <button
                    onClick={() => handleSwitchEditingRole("manager")}
                    className={`touch-target touch-feedback px-6 py-3 rounded-xl font-semibold text-base transition-all ${
                      state.editingLayoutForRole === "manager"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-card text-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    <i className="fas fa-user-tie mr-2"></i>Manager
                  </button>
                  <button
                    onClick={() => handleSwitchEditingRole("shop_floor")}
                    className={`touch-target touch-feedback px-6 py-3 rounded-xl font-semibold text-base transition-all ${
                      state.editingLayoutForRole === "shop_floor"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-card text-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    <i className="fas fa-user-hard-hat mr-2"></i>Shop Floor Operator
                  </button>
                </div>
              </div>
            )}

            {/* Layout Cleanup/Reset Buttons */}
            {isEditingMainBoard && (
              <div className="mt-6 flex items-center gap-4 flex-wrap">
                <button
                  onClick={handleCleanupLayout}
                  className="touch-target touch-feedback px-6 py-3 rounded-xl font-semibold text-base bg-orange-500/20 text-orange-600 border border-orange-500/50 hover:bg-orange-500/30 transition-all"
                >
                  <i className="fas fa-broom mr-2"></i>Clean Up Duplicates
                </button>
                <button
                  onClick={handleResetLayout}
                  className="touch-target touch-feedback px-6 py-3 rounded-xl font-semibold text-base bg-destructive/20 text-destructive border border-destructive/50 hover:bg-destructive/30 transition-all"
                >
                  <i className="fas fa-undo mr-2"></i>Reset to Defaults
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Grid for App Tiles */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] auto-rows-[150px] gap-8 lg:gap-10">
          {layoutItems.map((item, index) => renderAppTile(item, index))}
        </div>

        {/* Add App Button in Edit Mode */}
        {isEditingMainBoard && (
          <div className="mt-10">
            <button
              onClick={() => setOpenModal("app-store")}
              className="touch-target touch-feedback w-full py-6 border-2 border-dashed border-primary/50 rounded-2xl text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-4 font-semibold text-lg"
            >
              <i className="fas fa-plus-circle text-3xl"></i>Add App to Layout
            </button>
          </div>
        )}
      </main>

      {/* Save/Cancel Bar in Edit Mode */}
      {isEditingMainBoard && (
        <div className="fixed bottom-10 left-10 right-10 bg-popover border-2 border-primary rounded-full shadow-2xl px-8 py-5 flex items-center justify-center gap-6 z-40">
          <button
            onClick={handleCancelLayoutEdit}
            className="touch-target touch-feedback px-8 py-3 bg-muted text-muted-foreground rounded-full hover:bg-muted/80 transition-colors font-semibold text-base"
          >
            <i className="fas fa-times mr-2"></i>Cancel
          </button>
          <div className="h-10 w-px bg-border"></div>
          <button
            onClick={handleSaveLayout}
            className="touch-target touch-feedback px-8 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-semibold text-base"
          >
            <i className="fas fa-save mr-2"></i>Save Layout
          </button>
        </div>
      )}

      {/* --- Modals --- */}

      {/* Passcode Modal */}
      {openModal === "passcode" && state.pendingRoleChange && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-popover border border-border rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="text-center mb-6">
              <i className="fas fa-lock text-primary text-4xl mb-4"></i>
              <h3 className="text-2xl font-bold text-popover-foreground mb-2">Enter Passcode</h3>
              <p className="text-muted-foreground">Switching to: {state.users[state.pendingRoleChange]?.name}</p>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasscodeSubmit()}
                placeholder="Enter passcode"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />

              {passcodeError && (
                <div className="text-destructive text-sm text-center">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {passcodeError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handlePasscodeCancel}
                  className="flex-1 px-4 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasscodeSubmit}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {openModal === "settings" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-popover border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-popover">
              <div className="flex items-center gap-4">
                <i className="fas fa-cog text-primary text-2xl"></i>
                <h3 className="text-2xl font-bold text-popover-foreground">Settings</h3>
              </div>
              <button
                onClick={() => setOpenModal(null)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Device Settings */}
              <div className="p-4 bg-card border border-border rounded-xl">
                <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <i className="fas fa-tablet-alt text-primary"></i>Device Settings
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Device Name</label>
                    <input
                      type="text"
                      value={localStorage.getItem("integra_device_name") || ""}
                      onChange={(e) => {
                        const newName = e.target.value
                        localStorage.setItem("integra_device_name", newName)
                        const deviceId = localStorage.getItem("integra_device_id")
                        if (deviceId) {
                          apiClient.updateDeviceName(deviceId, newName)
                        }
                      }}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter device name"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      <i className="fas fa-info-circle mr-1"></i>This name identifies this device on the network
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-fingerprint"></i>
                      <span>Device ID: {localStorage.getItem("integra_device_id")?.substring(0, 20)}...</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* General Settings */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">App Library Title</label>
                <input
                  type="text"
                  value={state.config.appLibraryTitle}
                  onChange={(e) =>
                    setState((prevState) => ({
                      ...prevState,
                      config: { ...prevState.config, appLibraryTitle: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">App Library Subtitle</label>
                <input
                  type="text"
                  value={state.config.appLibrarySubtitle}
                  onChange={(e) =>
                    setState((prevState) => ({
                      ...prevState,
                      config: { ...prevState.config, appLibrarySubtitle: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* User Passcodes */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">User Passcodes</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-32 text-muted-foreground">Administrator:</span>
                    <input
                      type="text"
                      value={state.users.administrator.passcode || ""}
                      onChange={(e) =>
                        setState((prevState) => ({
                          ...prevState,
                          users: {
                            ...prevState.users,
                            administrator: { ...prevState.users.administrator, passcode: e.target.value },
                          },
                        }))
                      }
                      className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-32 text-muted-foreground">Manager:</span>
                    <input
                      type="text"
                      value={state.users.manager.passcode || ""}
                      onChange={(e) =>
                        setState((prevState) => ({
                          ...prevState,
                          users: {
                            ...prevState.users,
                            manager: { ...prevState.users.manager, passcode: e.target.value },
                          },
                        }))
                      }
                      className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App Store Modal */}
      {openModal === "app-store" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-popover border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-popover z-10">
              <div className="flex items-center gap-4">
                <i className="fas fa-store text-primary text-2xl"></i>
                <h3 className="text-2xl font-bold text-popover-foreground">App Store</h3>
              </div>
              <button
                onClick={() => {
                  setOpenModal(null)
                  setShowCustomAppForm(null) // Ensure custom app form is closed
                }}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>

            <div className="p-6">
              {/* Button to add custom apps (visible only to admin, when not creating one) */}
              {isAdmin && !showCustomAppForm && (
                <div className="mb-6 flex gap-3">
                  <button
                    onClick={() => {
                      setShowCustomAppForm("web")
                      setCustomAppForm({ ...customAppForm, type: "app" }) // Set default type to 'app' for web link
                    }}
                    className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-plus-circle"></i>Add Web Link App
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomAppForm("local")
                      setCustomAppForm({ ...customAppForm, type: "local" }) // Set default type to 'local'
                    }}
                    className="flex-1 py-3 px-4 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-desktop"></i>Add Local App
                  </button>
                </div>
              )}

              {/* Custom App Creation Form */}
              {showCustomAppForm && (
                <div className="mb-6 p-6 bg-card border border-border rounded-xl">
                  <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <i className={`fas ${showCustomAppForm === "web" ? "fa-link" : "fa-desktop"}`}></i>
                    {showCustomAppForm === "web" ? "Create Web Link App" : "Create Local App"}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        App Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={customAppForm.name}
                        onChange={(e) => setCustomAppForm({ ...customAppForm, name: e.target.value })}
                        placeholder="e.g., Company Portal"
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        {showCustomAppForm === "web" ? "URL" : "Path/URL"} <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={customAppForm.url}
                        onChange={(e) => setCustomAppForm({ ...customAppForm, url: e.target.value })}
                        placeholder={
                          showCustomAppForm === "web"
                            ? "https://example.com"
                            : "http://192.168.1.100:8080 or C:\\Program Files\\App"
                        }
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Description</label>
                      <textarea
                        value={customAppForm.description}
                        onChange={(e) => setCustomAppForm({ ...customAppForm, description: e.target.value })}
                        placeholder="Brief description of the app"
                        rows={2}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Icon (FontAwesome class)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customAppForm.icon}
                          onChange={(e) => setCustomAppForm({ ...customAppForm, icon: e.target.value })}
                          placeholder="fa-globe"
                          className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                          <i
                            className={`fas ${customAppForm.icon || "fa-question"} ${state.config.iconColor} text-xl`}
                          ></i>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Browse icons at{" "}
                        <a
                          href="https://fontawesome.com/icons"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          fontawesome.com/icons
                        </a>
                      </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          setShowCustomAppForm(null)
                          setCustomAppForm({ name: "", url: "", icon: "fa-globe", description: "", type: "app" })
                        }}
                        className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateCustomApp}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                      >
                        <i className="fas fa-check mr-2"></i>Create App
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* App Lists (only show if not creating a custom app) */}
              {!showCustomAppForm && (
                <>
                  <p className="text-muted-foreground mb-6">
                    {isEditingMainBoard
                      ? "Click on an app to add it to your layout"
                      : "Browse available applications for your workspace"}
                  </p>

                  {/* Custom Apps Section */}
                  {state.allAvailableApps.some((app) => app.isCustom) && (
                    <>
                      <h4 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                        <i className="fas fa-star text-primary"></i>Custom Apps
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {state.allAvailableApps
                          .filter((app) => app.isCustom)
                          .map((app) => {
                            const inLayout = isEditingMainBoard && editingLayout.some((item) => item.id === app.id)
                            return (
                              <div
                                key={app.id}
                                onClick={() => isEditingMainBoard && !inLayout && handleAddToLayout(app.id)}
                                className={`p-4 bg-card border border-border rounded-lg transition-all ${
                                  isEditingMainBoard && !inLayout
                                    ? "cursor-pointer hover:shadow-lg hover:border-primary"
                                    : inLayout
                                      ? "opacity-50"
                                      : ""
                                }`}
                              >
                                <div className="flex items-start gap-4">
                                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                                    <i className={`fas ${app.icon} ${state.config.iconColor} text-xl`}></i>
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                                      {app.name}
                                      {inLayout && <i className="fas fa-check text-primary text-sm"></i>}
                                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                        {app.type === "local" ? "Local" : "Web"}
                                      </span>
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-2">{app.description}</p>
                                    <p className="text-xs text-muted-foreground truncate">{app.url}</p>
                                  </div>
                                  {isAdmin && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteCustomApp(app.id)
                                      }}
                                      className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                      title="Delete custom app"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </>
                  )}

                  {/* Built-in Apps Section */}
                  <h4 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                    <i className="fas fa-th text-primary"></i>Built-in Apps
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {state.allAvailableApps
                      .filter((app) => {
                        const roleToEdit = state.editingLayoutForRole || state.currentUser.role
                        return !app.isCustom && app.roles.includes(roleToEdit)
                      })
                      .map((app) => {
                        const inLayout = isEditingMainBoard && editingLayout.some((item) => item.id === app.id)
                        return (
                          <div
                            key={app.id}
                            onClick={() => isEditingMainBoard && !inLayout && handleAddToLayout(app.id)}
                            className={`p-4 bg-card border border-border rounded-lg transition-all ${
                              isEditingMainBoard && !inLayout
                                ? "cursor-pointer hover:shadow-lg hover:border-primary"
                                : inLayout
                                  ? "opacity-50"
                                  : ""
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                                <i className={`fas ${app.icon} ${state.config.iconColor} text-xl`}></i>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                                  {app.name}
                                  {inLayout && <i className="fas fa-check text-primary text-sm"></i>}
                                </h4>
                                <p className="text-sm text-muted-foreground mb-2">{app.description}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <i className="fas fa-users"></i>
                                  <span>{app.roles.join(", ")}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* App Modal (for iframe content) */}
      {openModal === "app" && selectedApp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-popover border border-border rounded-2xl shadow-2xl w-11/12 h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-4">
                <i className={`fas ${selectedApp.icon} ${state.config.iconColor} text-2xl`}></i>
                <h3 className="text-xl font-bold text-popover-foreground">{selectedApp.name}</h3>
              </div>
              <button
                onClick={() => setOpenModal(null)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>
            <div className="p-2 flex-grow">
              <iframe
                src={selectedApp.url}
                className="w-full h-full border-0 rounded-b-xl"
                // Sandbox attributes for security - adjust as needed based on trusted sources
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                allow="fullscreen"
                title={`Content of ${selectedApp.name}`}
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* Communication App Modal */}
      {openModal === "communication" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-popover border border-border rounded-2xl shadow-2xl w-11/12 h-5/6 flex flex-col overflow-hidden">
            <CommunicationApp
              currentUser={state.currentUser.name}
              deviceId={localStorage.getItem("integra_device_id") || ""}
              onClose={() => setOpenModal(null)}
            />
          </div>
        </div>
      )}

      {/* Time Clock Modal */}
      {openModal === "timeclock" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-popover border border-border rounded-2xl shadow-2xl w-11/12 h-5/6 flex flex-col overflow-hidden">
            <FulcrumTimeclock onClose={() => setOpenModal(null)} />
          </div>
        </div>
      )}

      {/* Notice PDF Modal */}
      {openModal === "notice-pdf" && selectedNotice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-popover border border-border rounded-2xl shadow-2xl w-11/12 h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-4">
                <i className="fas fa-file-pdf text-destructive text-2xl"></i>
                <h3 className="text-xl font-bold text-popover-foreground">{selectedNotice.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedNotice.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-target touch-feedback px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm"
                >
                  <i className="fas fa-external-link-alt mr-2"></i>Open in New Tab
                </a>
                <button
                  onClick={() => setOpenModal(null)}
                  className="touch-target touch-feedback p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>
            </div>
            <div className="p-2 flex-grow relative">
              {/* Using object tag for PDF display, with fallbacks */}
              <object
                data={`${selectedNotice.url}#toolbar=0&navpanes=0&scrollbar=0`} // Hide PDF viewer controls
                type="application/pdf"
                className="w-full h-full rounded-b-xl"
              >
                {/* Fallback content if object tag fails or browser doesn't support */}
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center p-8 bg-card rounded-b-xl">
                  <i className="fas fa-file-pdf text-destructive text-6xl"></i>
                  <p className="text-foreground text-lg font-semibold">Unable to display PDF in browser</p>
                  <p className="text-muted-foreground">
                    Your browser may not support embedded PDFs or the file may be blocked.
                  </p>
                  <a
                    href={selectedNotice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="touch-target touch-feedback px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                  >
                    <i className="fas fa-external-link-alt mr-2"></i>Open PDF in New Tab
                  </a>
                  <a
                    href={selectedNotice.url}
                    download
                    className="touch-target touch-feedback px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-semibold"
                  >
                    <i className="fas fa-download mr-2"></i>Download PDF
                  </a>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}

      {/* Announcements Management Modal */}
      {openModal === "announcements" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-popover border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-popover">
              <div className="flex items-center gap-4">
                <i className="fas fa-bullhorn text-primary text-2xl"></i>
                <h3 className="text-2xl font-bold text-popover-foreground">Manage Announcements</h3>
              </div>
              <button
                onClick={() => setOpenModal(null)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Add New Announcement</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAnnouncement()}
                    placeholder="Type your announcement here..."
                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleAddAnnouncement}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                  >
                    <i className="fas fa-plus mr-2"></i>Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">Current Announcements</label>
                {state.announcements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <i className="fas fa-inbox text-4xl mb-3 block"></i>
                    <p>No announcements yet. Add one above!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {state.announcements.map((announcement, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg group hover:border-primary/50 transition-colors"
                      >
                        <i className="fas fa-bullhorn text-primary"></i>
                        <span className="flex-1 text-foreground">{announcement}</span>
                        <button
                          onClick={() => handleRemoveAnnouncement(index)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-destructive hover:bg-destructive/10 rounded transition-all"
                          title="Remove announcement"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notice Management Modal */}
      {openModal === "notice-management" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-popover border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-popover z-10">
              <div className="flex items-center gap-4">
                <i className="fas fa-thumbtack text-primary text-2xl"></i>
                <h3 className="text-2xl font-bold text-popover-foreground">Manage Notice Board</h3>
              </div>
              <button
                onClick={() => setOpenModal(null)}
                className="touch-target touch-feedback p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Upload New PDF Notice Section */}
              <div className="p-6 bg-card border border-border rounded-xl">
                <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <i className="fas fa-plus-circle text-primary"></i>Upload New PDF Notice
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Notice Title <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={newNoticeForm.title}
                      onChange={(e) => setNewNoticeForm({ ...newNoticeForm, title: e.target.value })}
                      placeholder="e.g., Safety Protocol Update"
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      PDF File <span className="text-destructive">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer">
                        <div
                          className={`w-full px-4 py-3 bg-background border-2 border-dashed rounded-lg text-center transition-colors ${
                            selectedFile
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          {selectedFile ? (
                            <div className="flex items-center justify-center gap-2 text-foreground">
                              <i className="fas fa-file-pdf text-destructive"></i>
                              <span className="font-medium">{selectedFile.name}</span>
                              <span className="text-sm text-muted-foreground">
                                ({(selectedFile.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              <i className="fas fa-cloud-upload-alt text-2xl mb-2 block"></i>
                              <span>Click to select PDF file</span>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                      {selectedFile && (
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="touch-target touch-feedback p-3 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          title="Remove file"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a PDF file from your computer (max 10MB)
                    </p>
                  </div>
                  <button
                    onClick={handleAddNotice}
                    disabled={uploadingPDF || !newNoticeForm.title.trim() || !selectedFile}
                    className="touch-target touch-feedback w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingPDF ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>Uploading...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload mr-2"></i>Upload Notice
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Current Notices List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <i className="fas fa-list text-primary"></i>All Notices
                  </h4>
                  <span className="text-sm text-muted-foreground">
                    {state.noticeBoardItems.filter((n) => n.pinned).length} / 4 pinned
                  </span>
                </div>

                {state.noticeBoardItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-lg">
                    <i className="fas fa-inbox text-4xl mb-3 block"></i>
                    <p>No notices yet. Upload one above!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {state.noticeBoardItems.map((notice) => (
                      <div
                        key={notice.id}
                        className={`p-4 bg-card border rounded-lg transition-all ${
                          notice.pinned ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => handleTogglePin(notice.id)}
                            className={`touch-target touch-feedback p-3 rounded-lg transition-all flex-shrink-0 ${
                              notice.pinned
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-primary/20"
                            }`}
                            title={notice.pinned ? "Unpin from widget" : "Pin to widget"} // Updated title for clarity
                          >
                            <i className={`fas fa-thumbtack text-xl ${notice.pinned ? "" : "rotate-45"}`}></i>
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h5 className="font-semibold text-foreground flex items-center gap-2">
                                <i className="fas fa-file-pdf text-destructive"></i>
                                {notice.title}
                                {notice.pinned && (
                                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Pinned</span>
                                )}
                              </h5>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleNoticeClick(notice)}
                                className="touch-target touch-feedback text-sm px-3 py-1.5 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                              >
                                <i className="fas fa-eye mr-1"></i>Preview
                              </button>
                              <button
                                onClick={() => handleRemoveNotice(notice.id)}
                                className="touch-target touch-feedback text-sm px-3 py-1.5 bg-destructive/20 text-destructive rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
                              >
                                <i className="fas fa-trash mr-1"></i>Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Server Config Modal */}
      <ServerConfig
        onClose={() => setShowServerConfig(false)}
        onConnect={async () => {
          const isConnected = await apiClient.healthCheck()
          setServerConnected(isConnected)
          if (isConnected) {
            const serverState = await apiClient.getState()
            if (serverState) {
              setState(serverState)
              // Update lastSyncedTimestamp on connect
              setLastSyncedTimestamp(serverState.lastModified || 0)
            } else {
              // If server is connected but has no state, fall back to default and save
              const defaultState = getDefaultState()
              defaultState.currentUser = defaultState.users.shop_floor // Ensure a default user
              setState(defaultState)
              const { currentUser, editingLayoutForRole, pendingRoleChange, ...syncedData } = defaultState
              await apiClient.saveState(syncedData)
            }
          }
          setShowServerConfig(false)
        }}
      />

      {/* Training Modal */}
      {openModal === "training" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-popover border border-border rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <i className="fas fa-chalkboard-teacher text-primary text-2xl"></i>
                <h3 className="text-2xl font-bold text-popover-foreground">Employee Training</h3>
              </div>
              <button
                onClick={() => {
                  setOpenModal(null)
                  setTrainingView("documents") // Reset to default view on close
                }}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>

            {/* Training View Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setTrainingView("documents")}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  trainingView === "documents"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <i className="fas fa-file-pdf mr-2"></i>Training Documents
              </button>
              <button
                onClick={() => setTrainingView("forms")}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  trainingView === "forms"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <i className="fas fa-clipboard-list mr-2"></i>Training Forms
              </button>
              <button
                onClick={() => setTrainingView("employees")}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  trainingView === "employees"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <i className="fas fa-users mr-2"></i>Employees
              </button>
              <button
                onClick={() => setTrainingView("matrix")}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  trainingView === "matrix"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <i className="fas fa-table mr-2"></i>Skills Matrix
              </button>
            </div>

            {/* Training View Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {trainingView === "documents" && (
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-foreground mb-4">Training Documents</h4>
                  {state.training.documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <i className="fas fa-inbox text-4xl mb-3 block"></i>
                      <p>No training documents available</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {state.training.documents.map((doc) => (
                        <div key={doc.id} className="p-4 bg-card border border-border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <i className="fas fa-file-pdf text-destructive text-xl"></i>
                              <span className="font-semibold text-foreground">{doc.title}</span>
                            </div>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                            >
                              <i className="fas fa-external-link-alt mr-2"></i>Open
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {trainingView === "forms" && (
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-foreground mb-4">Training Forms</h4>
                  {state.training.forms.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <i className="fas fa-inbox text-4xl mb-3 block"></i>
                      <p>No training forms available</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {state.training.forms.map((form) => (
                        <div key={form.id} className="p-4 bg-card border border-border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <i className="fas fa-clipboard-list text-primary text-xl"></i>
                              <span className="font-semibold text-foreground">{form.title}</span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <i className="fas fa-check-circle mr-1"></i>
                            Completed by {form.completedBy.length} employees
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {trainingView === "employees" && (
                <div className="space-y-6">
                  {/* Add/Edit Employee Form Section */}
                  {canAddEmployees && (
                    <div className="p-6 bg-card border border-border rounded-xl">
                      <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <i className="fas fa-user-plus text-primary"></i>
                        {editingEmployee ? "Edit Employee" : "Add New Employee"}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Name <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="text"
                            value={editingEmployee ? editingEmployee.name : newEmployeeForm.name}
                            onChange={(e) =>
                              editingEmployee
                                ? setEditingEmployee({ ...editingEmployee, name: e.target.value })
                                : setNewEmployeeForm({ ...newEmployeeForm, name: e.target.value })
                            }
                            placeholder="John Doe"
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Department <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="text"
                            value={editingEmployee ? editingEmployee.department : newEmployeeForm.department}
                            onChange={(e) =>
                              editingEmployee
                                ? setEditingEmployee({ ...editingEmployee, department: e.target.value })
                                : setNewEmployeeForm({ ...newEmployeeForm, department: e.target.value })
                            }
                            placeholder="Production"
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Position <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="text"
                            value={editingEmployee ? editingEmployee.position : newEmployeeForm.position}
                            onChange={(e) =>
                              editingEmployee
                                ? setEditingEmployee({ ...editingEmployee, position: e.target.value })
                                : setNewEmployeeForm({ ...newEmployeeForm, position: e.target.value })
                            }
                            placeholder="Machine Operator"
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Hire Date <span className="text-destructive">*</span>
                          </label>
                          <input
                            type="date"
                            value={editingEmployee ? editingEmployee.hireDate : newEmployeeForm.hireDate}
                            onChange={(e) =>
                              editingEmployee
                                ? setEditingEmployee({ ...editingEmployee, hireDate: e.target.value })
                                : setNewEmployeeForm({ ...newEmployeeForm, hireDate: e.target.value })
                            }
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        {editingEmployee && (
                          <button
                            onClick={() => setEditingEmployee(null)}
                            className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors font-semibold"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={editingEmployee ? handleUpdateEmployee : handleAddEmployee}
                          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                        >
                          <i className={`fas ${editingEmployee ? "fa-save" : "fa-plus"} mr-2`}></i>
                          {editingEmployee ? "Update Employee" : "Add Employee"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Access Denied for non-admins */}
                  {!canAddEmployees && (
                    <div className="p-6 bg-muted/50 border border-border rounded-xl text-center">
                      <i className="fas fa-lock text-muted-foreground text-3xl mb-3"></i>
                      <p className="text-muted-foreground">Only administrators can add or edit employees.</p>
                    </div>
                  )}

                  {/* All Employees List */}
                  <div>
                    <h4 className="text-lg font-bold text-foreground mb-4">All Employees ({employees.length})</h4>
                    {employees.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-lg">
                        <i className="fas fa-users text-4xl mb-3 block"></i>
                        <p>
                          No employees yet.{" "}
                          {canAddEmployees ? "Add one above!" : "Contact an administrator to add employees."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {employees.map((employee) => (
                          <div key={employee.id} className="p-4 bg-card border border-border rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-foreground text-lg mb-1">{employee.name}</h5>
                                <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                                  <div>
                                    <i className="fas fa-building mr-1"></i>
                                    {employee.department}
                                  </div>
                                  <div>
                                    <i className="fas fa-briefcase mr-1"></i>
                                    {employee.position}
                                  </div>
                                  <div>
                                    <i className="fas fa-calendar mr-1"></i>Hired:{" "}
                                    {new Date(employee.hireDate).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="mt-2 text-sm">
                                  <span className="text-primary font-semibold">
                                    {trainingRecords.filter((r) => r.employeeId === employee.id).length}
                                  </span>
                                  <span className="text-muted-foreground"> training records</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {canManageTraining && (
                                  <button
                                    onClick={() => {
                                      setSelectedEmployeeForTraining(employee.id)
                                      // Reset form fields for new record, pre-fill date
                                      setNewTrainingRecordForm({
                                        trainingId: "",
                                        trainingType: "document", // Default to document
                                        completedDate: new Date().toISOString().split("T")[0], // Today's date
                                        expiryDate: "",
                                        score: "",
                                        notes: "",
                                      })
                                    }}
                                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                                    title="Add training record"
                                  >
                                    <i className="fas fa-plus mr-1"></i>Training
                                  </button>
                                )}
                                {canAddEmployees && (
                                  <>
                                    <button
                                      onClick={() => setEditingEmployee(employee)}
                                      className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm"
                                      title="Edit employee"
                                    >
                                      <i className="fas fa-edit"></i>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEmployee(employee.id)}
                                      className="px-3 py-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-colors text-sm"
                                      title="Delete employee"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {trainingView === "matrix" && (
                <div className="space-y-4">
                  {/* Skills Matrix Legend */}
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-foreground">Skills Matrix</h4>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="text-muted-foreground">Completed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                        <span className="text-muted-foreground">Expiring Soon</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span className="text-muted-foreground">Expired</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-muted rounded"></div>
                        <span className="text-muted-foreground">Not Completed</span>
                      </div>
                    </div>
                  </div>

                  {/* Matrix Table or Placeholder */}
                  {employees.length === 0 || getAllTrainings().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-lg">
                      <i className="fas fa-table text-4xl mb-3 block"></i>
                      <p>
                        {employees.length === 0
                          ? "Add employees to view the skills matrix"
                          : "Add training documents or forms to view the skills matrix"}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-border p-3 text-left font-semibold text-foreground sticky left-0 bg-muted z-10">
                              Employee
                            </th>
                            {getAllTrainings().map((training) => (
                              <th
                                key={training.id}
                                className="border border-border p-3 text-left font-semibold text-foreground min-w-[150px]"
                              >
                                <div className="flex items-center gap-2">
                                  <i
                                    className={`fas ${training.type === "document" ? "fa-file-pdf text-destructive" : "fa-clipboard-list text-primary"}`}
                                  ></i>
                                  <span className="line-clamp-2">{training.title}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {employees.map((employee) => (
                            <tr key={employee.id} className="hover:bg-muted/50">
                              <td className="border border-border p-3 font-semibold text-foreground sticky left-0 bg-popover">
                                <div>
                                  <div>{employee.name}</div>
                                  <div className="text-xs text-muted-foreground">{employee.position}</div>
                                </div>
                              </td>
                              {/* Render cells for each training */}
                              {getAllTrainings().map((training) => {
                                const record = getEmployeeTrainingStatus(employee.id, training.id)
                                const isExpired = record?.expiryDate && new Date(record.expiryDate) < new Date()
                                const isExpiringSoon =
                                  record?.expiryDate &&
                                  new Date(record.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
                                  !isExpired // Ensure not already expired

                                return (
                                  <td
                                    key={training.id}
                                    className={`border border-border p-3 text-center ${
                                      record // Apply background based on status
                                        ? isExpired
                                          ? "bg-red-500/20"
                                          : isExpiringSoon
                                            ? "bg-yellow-500/20"
                                            : "bg-green-500/20"
                                        : "bg-muted/30" // Default for not completed
                                    }`}
                                  >
                                    {record ? (
                                      // Display record details if completed
                                      <div className="text-sm">
                                        <div className="font-semibold text-foreground">
                                          <i className="fas fa-check-circle text-green-600 mr-1"></i>
                                          {new Date(record.completedDate).toLocaleDateString()}
                                        </div>
                                        {record.expiryDate && (
                                          <div
                                            className={`text-xs mt-1 ${isExpired ? "text-red-600 font-semibold" : isExpiringSoon ? "text-yellow-600 font-semibold" : "text-muted-foreground"}`}
                                          >
                                            Expires: {new Date(record.expiryDate).toLocaleDateString()}
                                          </div>
                                        )}
                                        {record.score !== null &&
                                          record.score !== undefined && ( // Check for score existence
                                            <div className="text-xs text-muted-foreground mt-1">
                                              Score: {record.score}%
                                            </div>
                                          )}
                                        <button
                                          onClick={() => handleDeleteTrainingRecord(record.id)}
                                          className="mt-2 text-xs text-destructive hover:underline"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ) : (
                                      // Button to add record if not completed
                                      <button
                                        onClick={() => {
                                          setSelectedEmployeeForTraining(employee.id)
                                          setNewTrainingRecordForm({
                                            trainingId: training.id,
                                            trainingType: training.type,
                                            completedDate: new Date().toISOString().split("T")[0], // Pre-fill with today's date
                                            expiryDate: "", // Reset
                                            score: "", // Reset
                                            notes: "", // Reset
                                          })
                                        }}
                                        className="text-muted-foreground hover:text-primary transition-colors"
                                      >
                                        <i className="fas fa-plus-circle text-xl"></i>
                                      </button>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Training Record Modal (triggered from matrix/employee view) */}
      {selectedEmployeeForTraining && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-popover border border-border rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <i className="fas fa-certificate text-primary text-2xl"></i>
                <h3 className="text-2xl font-bold text-popover-foreground">Add Training Record</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedEmployeeForTraining(null) // Close modal
                  // Reset form fields
                  setNewTrainingRecordForm({
                    trainingId: "",
                    trainingType: "document",
                    completedDate: "",
                    expiryDate: "",
                    score: "",
                    notes: "",
                  })
                }}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Employee Display */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Employee</label>
                <div className="px-4 py-2 bg-muted border border-border rounded-lg text-foreground">
                  {employees.find((e) => e.id === selectedEmployeeForTraining)?.name || "Unknown Employee"}
                </div>
              </div>

              {/* Training Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Training Type <span className="text-destructive">*</span>
                </label>
                <select
                  value={newTrainingRecordForm.trainingType}
                  onChange={(e) =>
                    setNewTrainingRecordForm({
                      ...newTrainingRecordForm,
                      trainingType: e.target.value as "document" | "form",
                      trainingId: "", // Reset training ID when type changes
                    })
                  }
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="document">Training Document</option>
                  <option value="form">Training Form</option>
                </select>
              </div>

              {/* Training Selection */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Training <span className="text-destructive">*</span>
                </label>
                <select
                  value={newTrainingRecordForm.trainingId}
                  onChange={(e) => setNewTrainingRecordForm({ ...newTrainingRecordForm, trainingId: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select training...</option>
                  {(newTrainingRecordForm.trainingType === "document"
                    ? state.training.documents
                    : state.training.forms
                  ).map((training) => (
                    <option key={training.id} value={training.id}>
                      {training.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Completed Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    value={newTrainingRecordForm.completedDate}
                    onChange={(e) =>
                      setNewTrainingRecordForm({ ...newTrainingRecordForm, completedDate: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={newTrainingRecordForm.expiryDate}
                    onChange={(e) => setNewTrainingRecordForm({ ...newTrainingRecordForm, expiryDate: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Score Input */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Score (Optional, %)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newTrainingRecordForm.score}
                  onChange={(e) => setNewTrainingRecordForm({ ...newTrainingRecordForm, score: e.target.value })}
                  placeholder="85"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Notes Textarea */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Notes (Optional)</label>
                <textarea
                  value={newTrainingRecordForm.notes}
                  onChange={(e) => setNewTrainingRecordForm({ ...newTrainingRecordForm, notes: e.target.value })}
                  placeholder="Additional notes about this training..."
                  rows={3}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedEmployeeForTraining(null) // Close modal
                    // Reset form fields
                    setNewTrainingRecordForm({
                      trainingId: "",
                      trainingType: "document",
                      completedDate: "",
                      expiryDate: "",
                      score: "",
                      notes: "",
                    })
                  }}
                  className="flex-1 px-4 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTrainingRecord}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                >
                  <i className="fas fa-plus mr-2"></i>Add Training Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
