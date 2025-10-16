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

export async function GET() {
  try {
    console.log("[v0] [API] GET /api/devices - Fetching devices from filesystem")

    await ensureDataDir()

    try {
      const data = await fs.readFile(DEVICES_FILE, "utf-8")
      const devices = JSON.parse(data)

      const transformedDevices = devices.map((device: any) => ({
        id: device.deviceId,
        name: device.deviceName,
        registeredAt: device.registeredAt,
        lastSeen: device.lastSeen,
      }))

      console.log("[v0] [API] Found devices:", transformedDevices.length, "devices")
      console.log("[v0] [API] Device list:", transformedDevices)
      return NextResponse.json(transformedDevices)
    } catch (error) {
      console.log("[v0] [API] No devices file found, returning empty array")
      return NextResponse.json([])
    }
  } catch (error) {
    console.error("[v0] [API] Error getting devices:", error)
    return NextResponse.json([])
  }
}
