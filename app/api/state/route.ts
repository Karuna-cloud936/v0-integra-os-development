import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const STATE_FILE = path.join(DATA_DIR, "integra-state.json")

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

export async function GET() {
  try {
    console.log("[v0] [API] GET /api/state - Fetching state from filesystem")

    await ensureDataDir()

    try {
      const data = await fs.readFile(STATE_FILE, "utf-8")
      const state = JSON.parse(data)
      console.log(
        "[v0] [API] State loaded successfully, lastModified:",
        state.lastModified,
        "modifiedBy:",
        state.modifiedBy,
      )
      return NextResponse.json(state)
    } catch (error) {
      // File doesn't exist yet
      console.log("[v0] [API] No existing state found")
      return NextResponse.json(null)
    }
  } catch (error) {
    console.error("[v0] [API] Error getting state:", error)
    return NextResponse.json(null)
  }
}

export async function POST(request: Request) {
  try {
    const state = await request.json()
    const deviceId = request.headers.get("x-device-id") || "unknown"

    state.lastModified = Date.now()
    state.modifiedBy = deviceId

    console.log(
      "[v0] [API] POST /api/state - Saving state from device:",
      deviceId,
      "at:",
      new Date(state.lastModified).toLocaleTimeString(),
    )

    await ensureDataDir()
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8")

    console.log("[v0] [API] State saved successfully to filesystem")
    return NextResponse.json({
      success: true,
      lastModified: state.lastModified,
    })
  } catch (error) {
    console.error("[v0] [API] Error saving state:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 },
    )
  }
}
