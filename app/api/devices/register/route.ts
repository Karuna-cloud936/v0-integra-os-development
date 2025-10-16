import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const DEVICES_FILE = path.join(DATA_DIR, "devices.json")

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

export async function POST(request: Request) {
  try {
    const { deviceId, deviceName } = await request.json()

    console.log("[v0] [API] POST /api/devices/register - Registering device:", { deviceId, deviceName })

    if (!deviceId || !deviceName) {
      return NextResponse.json({ error: "Device ID and name are required" }, { status: 400 })
    }

    const device = {
      deviceId: deviceId,
      deviceName: deviceName,
      registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    }

    await ensureDataDir()

    let devices = []
    try {
      const data = await fs.readFile(DEVICES_FILE, "utf-8")
      devices = JSON.parse(data)
    } catch (error) {
      console.log("[v0] [API] No existing devices file, creating new one")
    }

    const existingIndex = devices.findIndex((d: any) => d.deviceId === deviceId)
    if (existingIndex >= 0) {
      devices[existingIndex] = device
      console.log("[v0] [API] Updated existing device")
    } else {
      devices.push(device)
      console.log("[v0] [API] Added new device")
    }

    await fs.writeFile(DEVICES_FILE, JSON.stringify(devices, null, 2), "utf-8")
    console.log("[v0] [API] Saved devices to file. Total devices:", devices.length)

    return NextResponse.json({ success: true, device })
  } catch (error) {
    console.error("[v0] [API] Error registering device:", error)
    return NextResponse.json({ error: "Failed to register device" }, { status: 500 })
  }
}
