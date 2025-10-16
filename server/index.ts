import express from "express"
import http from "http"
import https from "https"
import fs from "fs"
import path from "path"
import cors from "cors"
import Database from "better-sqlite3"
import multer from "multer"
import fetch from "node-fetch"

const app = express()
const HTTP_PORT = process.env.HTTP_PORT || 3001
const HTTPS_PORT = process.env.HTTPS_PORT || 3443

// Middleware
app.use(cors())
app.use(express.json({ limit: "50mb" }))

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Get full state
app.get("/api/state", (req, res) => {
  try {
    const row = db.prepare("SELECT data FROM state WHERE id = 1").get() as { data: string } | undefined
    if (row) {
      res.json(JSON.parse(row.data))
    } else {
      res.json(null)
    }
  } catch (error) {
    console.error("[Server] Error getting state:", error)
    res.status(500).json({ error: "Failed to get state" })
  }
})

// Save full state
app.post("/api/state", (req, res) => {
  try {
    const deviceId = (req.headers["x-device-id"] as string) || "unknown"
    const timestamp = Date.now()

    // Add metadata to state
    const stateWithMetadata = {
      ...req.body,
      lastModified: timestamp,
      modifiedBy: deviceId,
    }

    const stateData = JSON.stringify(stateWithMetadata)

    console.log(`[Server] Saving state from device: ${deviceId} at ${new Date(timestamp).toISOString()}`)

    db.prepare(`
      INSERT INTO state (id, data, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET data = ?, updated_at = CURRENT_TIMESTAMP
    `).run(stateData, stateData)

    console.log("[Server] State saved successfully")

    res.json({ success: true, lastModified: timestamp })
  } catch (error) {
    console.error("[Server] Error saving state:", error)
    res.status(500).json({ error: "Failed to save state" })
  }
})

const uploadsDir = path.join(__dirname, "uploads", "pdfs")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    cb(null, `${uniqueSuffix}-${file.originalname}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true)
    } else {
      cb(new Error("Only PDF files are allowed"))
    }
  },
})

app.use("/uploads/pdfs", express.static(uploadsDir))

// Upload PDF
app.post("/api/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    // Return the URL path to access the file
    const fileUrl = `/uploads/pdfs/${req.file.filename}`

    console.log(`[Server] PDF uploaded: ${req.file.filename}`)

    res.json({ url: fileUrl })
  } catch (error) {
    console.error("[Server] Error uploading PDF:", error)
    res.status(500).json({ error: "Failed to upload PDF" })
  }
})

// Delete PDF
app.delete("/api/delete-pdf", async (req, res) => {
  try {
    const { url } = req.body
    if (!url) {
      return res.status(400).json({ error: "Missing URL" })
    }

    // Extract filename from URL path
    const filename = path.basename(url)
    const filePath = path.join(uploadsDir, filename)

    // Check if file exists and delete it
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      console.log(`[Server] PDF deleted: ${filename}`)
      res.json({ success: true })
    } else {
      console.warn(`[Server] PDF not found: ${filename}`)
      res.status(404).json({ error: "File not found" })
    }
  } catch (error) {
    console.error("[Server] Error deleting PDF:", error)
    res.status(500).json({ error: "Failed to delete PDF" })
  }
})

app.post("/api/devices/register", (req, res) => {
  try {
    const { deviceId, deviceName } = req.body
    if (!deviceId || !deviceName) {
      return res.status(400).json({ error: "Missing deviceId or deviceName" })
    }

    db.prepare(`
      INSERT INTO devices (id, name, last_seen, created_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET 
        name = ?,
        last_seen = CURRENT_TIMESTAMP
    `).run(deviceId, deviceName, deviceName)

    res.json({ success: true })
  } catch (error) {
    console.error("[Server] Error registering device:", error)
    res.status(500).json({ error: "Failed to register device" })
  }
})

app.patch("/api/devices/:deviceId", (req, res) => {
  try {
    const { deviceId } = req.params
    const { deviceName } = req.body

    if (!deviceName) {
      return res.status(400).json({ error: "Missing deviceName" })
    }

    db.prepare(`
      UPDATE devices 
      SET name = ?, last_seen = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(deviceName, deviceId)

    res.json({ success: true })
  } catch (error) {
    console.error("[Server] Error updating device:", error)
    res.status(500).json({ error: "Failed to update device" })
  }
})

app.get("/api/devices", (req, res) => {
  try {
    const devices = db
      .prepare(`
      SELECT id, name, last_seen, created_at 
      FROM devices 
      ORDER BY last_seen DESC
    `)
      .all()

    res.json(devices)
  } catch (error) {
    console.error("[Server] Error getting devices:", error)
    res.status(500).json({ error: "Failed to get devices" })
  }
})

// Initialize SQLite database
const dbPath = path.join(__dirname, "integra-data.db")
const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pdfs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS custom_apps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    to_device TEXT NOT NULL,
    from_device TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data TEXT,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    from_device TEXT NOT NULL,
    to_device TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    position TEXT NOT NULL,
    hire_date TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS training_records (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    training_id TEXT NOT NULL,
    training_type TEXT NOT NULL,
    completed_date TEXT NOT NULL,
    expiry_date TEXT,
    score INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );
`)

// Get messages
app.get("/api/messages", (req, res) => {
  try {
    console.log("[Server] GET /api/messages - Fetching all messages")

    const messages = db
      .prepare(`
        SELECT id, from_device as "from", to_device as "to", text, timestamp
        FROM messages 
        ORDER BY timestamp DESC 
        LIMIT 1000
      `)
      .all()

    console.log(`[Server] Found ${messages.length} messages`)
    res.json({ messages })
  } catch (error) {
    console.error("[Server] Error getting messages:", error)
    res.status(500).json({ messages: [] })
  }
})

// Send message
app.post("/api/messages", (req, res) => {
  try {
    const { id, from, to, text, timestamp } = req.body

    console.log("[Server] POST /api/messages - Saving message:", { id, from, to, text })

    if (!id || !from || !to || !text || !timestamp) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    db.prepare(`
      INSERT INTO messages (id, from_device, to_device, text, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, from, to, text, timestamp)

    console.log("[Server] Message saved successfully")

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    db.prepare(`
      INSERT INTO notifications (id, to_device, from_device, type, title, message, created_at)
      VALUES (?, ?, ?, 'message', 'New Message', ?, CURRENT_TIMESTAMP)
    `).run(notificationId, to, from, text)

    console.log(`[Server] Notification sent to device ${to}`)

    res.json({ success: true })
  } catch (error) {
    console.error("[Server] Error saving message:", error)
    res.status(500).json({ success: false, error: "Failed to save message" })
  }
})

app.post("/api/notifications", (req, res) => {
  try {
    const { toDevice, fromDevice, type, title, message, data } = req.body

    if (!toDevice || !fromDevice || !type || !title) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    db.prepare(`
      INSERT INTO notifications (id, to_device, from_device, type, title, message, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(notificationId, toDevice, fromDevice, type, title, message || null, data ? JSON.stringify(data) : null)

    console.log(`[Server] Notification sent: ${type} from ${fromDevice} to ${toDevice}`)

    res.json({ success: true, notificationId })
  } catch (error) {
    console.error("[Server] Error creating notification:", error)
    res.status(500).json({ error: "Failed to create notification" })
  }
})

app.get("/api/notifications/:deviceId", (req, res) => {
  try {
    const { deviceId } = req.params
    const { unreadOnly } = req.query

    let query = "SELECT * FROM notifications WHERE to_device = ?"
    const params: any[] = [deviceId]

    if (unreadOnly === "true") {
      query += " AND read = 0"
    }

    query += " ORDER BY created_at DESC LIMIT 50"

    const notifications = db.prepare(query).all(...params)

    // Parse JSON data field
    const parsedNotifications = notifications.map((n: any) => ({
      ...n,
      data: n.data ? JSON.parse(n.data) : null,
      read: Boolean(n.read),
    }))

    res.json(parsedNotifications)
  } catch (error) {
    console.error("[Server] Error fetching notifications:", error)
    res.status(500).json({ error: "Failed to fetch notifications" })
  }
})

app.patch("/api/notifications/:notificationId/read", (req, res) => {
  try {
    const { notificationId } = req.params

    db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(notificationId)

    res.json({ success: true })
  } catch (error) {
    console.error("[Server] Error marking notification as read:", error)
    res.status(500).json({ error: "Failed to mark notification as read" })
  }
})

app.delete("/api/notifications/:notificationId", (req, res) => {
  try {
    const { notificationId } = req.params

    db.prepare("DELETE FROM notifications WHERE id = ?").run(notificationId)

    res.json({ success: true })
  } catch (error) {
    console.error("[Server] Error deleting notification:", error)
    res.status(500).json({ error: "Failed to delete notification" })
  }
})

app.get("/api/employees", (req, res) => {
  try {
    const employees = db
      .prepare(`
        SELECT id, name, department, position, hire_date as hireDate, created_at as createdAt
        FROM employees 
        ORDER BY name ASC
      `)
      .all()

    res.json(employees)
  } catch (error) {
    console.error("[Server] Error getting employees:", error)
    res.status(500).json({ error: "Failed to get employees" })
  }
})

app.post("/api/employees", (req, res) => {
  try {
    const { id, name, department, position, hireDate, createdAt } = req.body

    if (!id || !name || !department || !position || !hireDate) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    db.prepare(`
      INSERT INTO employees (id, name, department, position, hire_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, department, position, hireDate, createdAt || Date.now())

    console.log(`[Server] Employee created: ${name}`)
    res.json({ success: true })
  } catch (error) {
    console.error("[Server] Error creating employee:", error)
    res.status(500).json({ error: "Failed to create employee" })
  }
})

app.put("/api/employees/:id", (req, res) => {
  try {
    const { id } = req.params
    const { name, department, position, hireDate } = req.body

    if (!name || !department || !position || !hireDate) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    db.prepare(`
      UPDATE employees 
      SET name = ?, department = ?, position = ?, hire_date = ?
      WHERE id = ?
    `).run(name, department, position, hireDate, id)

    console.log(`[Server] Employee updated: ${id}`)
    res.json({ success: true })
  } catch (error) {
    console.error("[Server] Error updating employee:", error)
    res.status(500).json({ error: "Failed to update employee" })
  }
})

app.delete("/api/employees/:id", (req, res) => {
  try {
    const { id } = req.params

    db.prepare("DELETE FROM employees WHERE id = ?").run(id)
    db.prepare("DELETE FROM training_records WHERE employee_id = ?").run(id)

    console.log(`[Server] Employee deleted: ${id}`)
    res.json({ success: true })
  } catch (error) {
    console.error("[Server] Error deleting employee:", error)
    res.status(500).json({ error: "Failed to delete employee" })
  }
})

app.get("/api/training-records", (req, res) => {
  try {
    const records = db
      .prepare(`
        SELECT 
          id, 
          employee_id as employeeId, 
          training_id as trainingId, 
          training_type as trainingType,
          completed_date as completedDate,
          expiry_date as expiryDate,
          score,
          notes
        FROM training_records 
        ORDER BY completed_date DESC
      `)
      .all()

    res.json(records)
  } catch (error) {
    console.error("[Server] Error getting training records:", error)
    res.status(500).json({ error: "Failed to get training records" })
  }
})

app.post("/api/training-records", (req, res) => {
  try {
    const { id, employeeId, trainingId, trainingType, completedDate, expiryDate, score, notes } = req.body

    if (!id || !employeeId || !trainingId || !trainingType || !completedDate) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    db.prepare(`
      INSERT INTO training_records (id, employee_id, training_id, training_type, completed_date, expiry_date, score, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, employeeId, trainingId, trainingType, completedDate, expiryDate || null, score || null, notes || null)

    console.log(`[Server] Training record created for employee: ${employeeId}`)
    res.json({ success: true })
  } catch (error) {
    console.error("[Server] Error creating training record:", error)
    res.status(500).json({ error: "Failed to create training record" })
  }
})

app.delete("/api/training-records/:id", (req, res) => {
  try {
    const { id } = req.params

    db.prepare("DELETE FROM training_records WHERE id = ?").run(id)

    console.log(`[Server] Training record deleted: ${id}`)
    res.json({ success: true })
  } catch (error) {
    console.error("[Server] Error deleting training record:", error)
    res.status(500).json({ error: "Failed to delete training record" })
  }
})

const FULCRUM_API_KEY =
  process.env.FULCRUM_API_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJOYW1lIjoiRGFzaGJvYXJkIiwiUmV2b2NhdGlvbklkIjoiNDYzYzBlZDAtZWI3ZC00OGEwLWFjOWItMjk1YjFiOTRkZGYyIiwiZXhwIjoxODkzMzMwMDAwLCJpc3MiOiJpbnRlZ3Jhc3lzdGVtcy5mdWxjcnVtcHJvLmNvbSIsImF1ZCI6ImludGVncmFzeXN0ZW1zIn0.ig_6CkH15MiD3nMYDgLvfzDI8iQkYBUpyQKRvt-mnLE"
const FULCRUM_BASE_URL = "https://integrasystems.fulcrumpro.com/api"

app.get("/api/fulcrum/inventory", async (req, res) => {
  try {
    console.log("[Server] Fetching inventory from Fulcrum API...")
    console.log("[Server] Using API key:", FULCRUM_API_KEY.substring(0, 20) + "...")
    console.log("[Server] Fulcrum URL:", `${FULCRUM_BASE_URL}/inventory/onhand`)

    // Fetch on-hand quantities
    const onHandResponse = await fetch(`${FULCRUM_BASE_URL}/inventory/onhand`, {
      headers: {
        Authorization: `Bearer ${FULCRUM_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    console.log("[Server] Fulcrum inventory response status:", onHandResponse.status)

    if (!onHandResponse.ok) {
      const errorText = await onHandResponse.text()
      console.error("[Server] Fulcrum API error response:", errorText)
      throw new Error(`Fulcrum API error: ${onHandResponse.status} - ${errorText}`)
    }

    const onHandData = await onHandResponse.json()
    console.log("[Server] Fulcrum inventory raw data:", JSON.stringify(onHandData).substring(0, 200))

    // Handle different response formats
    let items = []

    // Check if response is an array or has a data property
    const dataArray = Array.isArray(onHandData) ? onHandData : onHandData.data || onHandData.items || []

    if (dataArray.length === 0) {
      console.log("[Server] No inventory data returned from Fulcrum")
      return res.json({
        items: [],
        lastUpdated: new Date().toISOString(),
        error: "No inventory data available from Fulcrum",
      })
    }

    // Transform data to expected format
    items = dataArray.map((item: any) => ({
      itemId: item.itemId || item.id || item.ItemId || String(Math.random()),
      itemNumber: item.itemNumber || item.ItemNumber || item.number || item.id || "Unknown",
      description: item.description || item.Description || item.name || "No description",
      onHand: Number(item.quantity || item.onHand || item.OnHand || 0),
      available: Number(item.available || item.Available || item.quantity || 0),
      reserved: Number(item.reserved || item.Reserved || 0),
      unit: item.unit || item.Unit || item.uom || "EA",
      lowStockThreshold: Number(item.reorderPoint || item.ReorderPoint || item.minQuantity || 10),
    }))

    // Sort by stock status
    items.sort((a, b) => {
      const aStatus = a.onHand === 0 ? 0 : a.onHand <= a.lowStockThreshold ? 1 : 2
      const bStatus = b.onHand === 0 ? 0 : b.onHand <= b.lowStockThreshold ? 1 : 2
      if (aStatus !== bStatus) return aStatus - bStatus
      return a.itemNumber.localeCompare(b.itemNumber)
    })

    console.log(`[Server] Successfully transformed ${items.length} inventory items`)

    res.json({
      items,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Server] Error fetching Fulcrum inventory:", error.message)
    console.error("[Server] Full error:", error)
    res.json({
      items: [],
      lastUpdated: new Date().toISOString(),
      error: `Failed to fetch inventory: ${error.message}`,
    })
  }
})

app.get("/api/fulcrum/operations", async (req, res) => {
  try {
    console.log("[Server] Fetching operations from Fulcrum API...")
    console.log("[Server] Fulcrum URL:", `${FULCRUM_BASE_URL}/jobs`)

    const jobsResponse = await fetch(`${FULCRUM_BASE_URL}/jobs?status=InProgress`, {
      headers: {
        Authorization: `Bearer ${FULCRUM_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    console.log("[Server] Fulcrum operations response status:", jobsResponse.status)

    if (!jobsResponse.ok) {
      const errorText = await jobsResponse.text()
      console.error("[Server] Fulcrum API error response:", errorText)
      throw new Error(`Fulcrum API error: ${jobsResponse.status}`)
    }

    const jobsData = await jobsResponse.json()
    console.log("[Server] Fulcrum jobs raw data:", JSON.stringify(jobsData).substring(0, 200))

    // Handle different response formats
    const dataArray = Array.isArray(jobsData) ? jobsData : jobsData.data || jobsData.jobs || []

    const operations = dataArray
      .map((job: any) => ({
        id: job.id || job.Id || String(Math.random()),
        status: job.status || job.Status || "InProgress",
        machine: job.equipmentName || job.EquipmentName || job.workCenter || job.WorkCenter || "Machine",
        jobNumber: job.jobNumber || job.JobNumber || job.number || job.id || "Unknown",
        partNumber: job.partNumber || job.PartNumber || job.part || "",
        description: job.description || job.Description || job.name || "",
        personnel: [],
        timeSpent: Number(job.actualTime || job.ActualTime || 0),
        timeEstimated: Number(job.estimatedTime || job.EstimatedTime || job.standardTime || 3600),
        completionPercentage: 0,
        isLate: false,
      }))
      .map((op: any) => ({
        ...op,
        completionPercentage:
          op.timeEstimated > 0 ? Math.min(Math.round((op.timeSpent / op.timeEstimated) * 100), 100) : 0,
      }))

    console.log(`[Server] Successfully transformed ${operations.length} operations`)

    res.json({
      operations,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Server] Error fetching Fulcrum operations:", error.message)
    res.json({
      operations: [],
      lastUpdated: new Date().toISOString(),
      error: `Failed to fetch operations: ${error.message}`,
    })
  }
})

app.get("/api/fulcrum/production", async (req, res) => {
  try {
    console.log("[Server] Fetching production data from Fulcrum API...")

    const jobsResponse = await fetch(`${FULCRUM_BASE_URL}/jobs?status=Complete`, {
      headers: {
        Authorization: `Bearer ${FULCRUM_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    console.log("[Server] Fulcrum production response status:", jobsResponse.status)

    if (!jobsResponse.ok) {
      const errorText = await jobsResponse.text()
      console.error("[Server] Fulcrum API error response:", errorText)
      throw new Error(`Fulcrum API error: ${jobsResponse.status}`)
    }

    const jobsData = await jobsResponse.json()
    console.log("[Server] Fulcrum production raw data:", JSON.stringify(jobsData).substring(0, 200))

    // Handle different response formats
    const dataArray = Array.isArray(jobsData) ? jobsData : jobsData.data || jobsData.jobs || []

    // Create mock production data if no real data
    const production = [
      {
        id: "wc1",
        name: "Assembly",
        completed: dataArray.length > 0 ? Math.floor(dataArray.length * 0.3) : 0,
        target: 100,
        efficiency: 0,
      },
      {
        id: "wc2",
        name: "Machining",
        completed: dataArray.length > 0 ? Math.floor(dataArray.length * 0.25) : 0,
        target: 80,
        efficiency: 0,
      },
      {
        id: "wc3",
        name: "Welding",
        completed: dataArray.length > 0 ? Math.floor(dataArray.length * 0.2) : 0,
        target: 60,
        efficiency: 0,
      },
      {
        id: "wc4",
        name: "Finishing",
        completed: dataArray.length > 0 ? Math.floor(dataArray.length * 0.15) : 0,
        target: 50,
        efficiency: 0,
      },
      {
        id: "wc5",
        name: "QC",
        completed: dataArray.length > 0 ? Math.floor(dataArray.length * 0.1) : 0,
        target: 40,
        efficiency: 0,
      },
    ].map((wc) => ({
      ...wc,
      efficiency: wc.target > 0 ? Math.round((wc.completed / wc.target) * 100) : 0,
    }))

    console.log(`[Server] Generated production data for ${production.length} work centers`)

    res.json({
      production,
      totalCompleted: dataArray.length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Server] Error fetching Fulcrum production:", error.message)
    res.json({
      production: [],
      totalCompleted: 0,
      lastUpdated: new Date().toISOString(),
      error: `Failed to fetch production: ${error.message}`,
    })
  }
})

// Get employees from Fulcrum
app.get("/api/fulcrum/employees", async (req, res) => {
  try {
    console.log("[Server] Fetching employees from Fulcrum API...")

    const response = await fetch(`${FULCRUM_BASE_URL}/employees`, {
      headers: {
        Authorization: `Bearer ${FULCRUM_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Fulcrum API error: ${response.status}`)
    }

    const employeesData = await response.json()

    // Transform to expected format
    const employees = employeesData.map((emp: any) => ({
      id: emp.id,
      firstName: emp.firstName || emp.name?.split(" ")[0] || "Unknown",
      lastName: emp.lastName || emp.name?.split(" ").slice(1).join(" ") || "",
      employeeNumber: emp.employeeNumber || emp.id,
      pin: emp.pin || emp.employeeNumber,
    }))

    console.log(`[Server] Fetched ${employees.length} employees from Fulcrum`)

    res.json({ employees })
  } catch (error) {
    console.error("[Server] Error fetching Fulcrum employees:", error)
    res.json({ employees: [] })
  }
})

// Get active timers from Fulcrum
app.get("/api/fulcrum/timeclock/timers", async (req, res) => {
  try {
    console.log("[Server] Fetching active timers from Fulcrum API...")

    const response = await fetch(`${FULCRUM_BASE_URL}/timeclock/timers?status=active`, {
      headers: {
        Authorization: `Bearer ${FULCRUM_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Fulcrum API error: ${response.status}`)
    }

    const timersData = await response.json()

    // Transform to expected format
    const timers = timersData.map((timer: any) => ({
      id: timer.id,
      employeeId: timer.employeeId,
      employeeName: timer.employeeName || `${timer.firstName || ""} ${timer.lastName || ""}`.trim(),
      startTime: timer.startTime || timer.clockInTime,
      jobNumber: timer.jobNumber || timer.jobId,
    }))

    console.log(`[Server] Fetched ${timers.length} active timers from Fulcrum`)

    res.json({ timers })
  } catch (error) {
    console.error("[Server] Error fetching Fulcrum timers:", error)
    res.json({ timers: [] })
  }
})

// Clock in employee
app.post("/api/fulcrum/timeclock/clock-in", async (req, res) => {
  try {
    const { employeeId } = req.body

    if (!employeeId) {
      return res.status(400).json({ success: false, error: "Missing employeeId" })
    }

    console.log(`[Server] Clocking in employee: ${employeeId}`)

    const response = await fetch(`${FULCRUM_BASE_URL}/timeclock/clockin`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FULCRUM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employeeId,
        clockInTime: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Fulcrum API error: ${response.status}`)
    }

    const result = await response.json()

    console.log(`[Server] Employee ${employeeId} clocked in successfully`)

    res.json({ success: true, timer: result })
  } catch (error: any) {
    console.error("[Server] Error clocking in employee:", error)
    res.json({ success: false, error: error.message || "Failed to clock in" })
  }
})

// Clock out employee
app.post("/api/fulcrum/timeclock/clock-out", async (req, res) => {
  try {
    const { timerId } = req.body

    if (!timerId) {
      return res.status(400).json({ success: false, error: "Missing timerId" })
    }

    console.log(`[Server] Clocking out timer: ${timerId}`)

    const response = await fetch(`${FULCRUM_BASE_URL}/timeclock/clockout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FULCRUM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timerId,
        clockOutTime: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Fulcrum API error: ${response.status}`)
    }

    const result = await response.json()

    console.log(`[Server] Timer ${timerId} clocked out successfully`)

    res.json({ success: true, result })
  } catch (error: any) {
    console.error("[Server] Error clocking out:", error)
    res.json({ success: false, error: error.message || "Failed to clock out" })
  }
})

const httpServer = http.createServer(app)
httpServer.listen(HTTP_PORT, () => {
  console.log(`[Integra Server] HTTP server running on http://localhost:${HTTP_PORT}`)
  console.log(`[Integra Server] Database: ${dbPath}`)
})

const certPath = path.join(__dirname, "certs")
if (!fs.existsSync(certPath)) {
  fs.mkdirSync(certPath, { recursive: true })
}

const keyPath = path.join(certPath, "key.pem")
const certFilePath = path.join(certPath, "cert.pem")

// Check if certificates exist, if not, create self-signed ones
if (!fs.existsSync(keyPath) || !fs.existsSync(certFilePath)) {
  console.log("[Integra Server] Generating self-signed SSL certificates...")
  const { execSync } = require("child_process")
  try {
    execSync(
      `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certFilePath}" -days 365 -nodes -subj "/CN=localhost"`,
      { stdio: "inherit" },
    )
    console.log("[Integra Server] SSL certificates generated successfully")
  } catch (error) {
    console.error("[Integra Server] Failed to generate SSL certificates:", error)
    console.error("[Integra Server] HTTPS will not be available")
  }
}

// Start HTTPS server if certificates exist
if (fs.existsSync(keyPath) && fs.existsSync(certFilePath)) {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certFilePath),
  }

  const httpsServer = https.createServer(httpsOptions, app)
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`[Integra Server] HTTPS server running on https://localhost:${HTTPS_PORT}`)
    console.log(`[Integra Server] Use HTTPS for camera/microphone access`)
    console.log(`[Integra Server] Note: Self-signed certificate - browsers will show security warning`)
  })
} else {
  console.warn("[Integra Server] HTTPS not available - SSL certificates not found")
  console.warn("[Integra Server] Camera/microphone features will not work without HTTPS")
}
