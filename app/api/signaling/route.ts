import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

interface SignalingMessage {
  id: string
  from: string
  to: string
  type: "offer" | "answer" | "ice-candidate" | "call-request" | "call-accept" | "call-reject" | "call-end"
  data: any
  timestamp: number
}

const DATA_DIR = path.join(process.cwd(), "data")
const SIGNALING_FILE = path.join(DATA_DIR, "signaling.json")

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("deviceId")

    if (!deviceId) {
      return NextResponse.json({ messages: [] })
    }

    await ensureDataDir()

    let allMessages: SignalingMessage[] = []
    try {
      const data = await fs.readFile(SIGNALING_FILE, "utf-8")
      allMessages = JSON.parse(data)
    } catch (error) {
      // File doesn't exist yet
      return NextResponse.json({ messages: [] })
    }

    // Filter messages for this device
    const messages = allMessages.filter((msg) => msg.to === deviceId)

    // Remove old messages (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const recentMessages = allMessages.filter((msg) => msg.timestamp > fiveMinutesAgo && msg.to !== deviceId)

    await fs.writeFile(SIGNALING_FILE, JSON.stringify(recentMessages, null, 2), "utf-8")

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[API] Error getting signaling messages:", error)
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(request: Request) {
  try {
    const message: SignalingMessage = await request.json()

    await ensureDataDir()

    let messages: SignalingMessage[] = []
    try {
      const data = await fs.readFile(SIGNALING_FILE, "utf-8")
      messages = JSON.parse(data)
    } catch (error) {
      // File doesn't exist yet
    }

    // Add new message
    messages.push(message)

    await fs.writeFile(SIGNALING_FILE, JSON.stringify(messages, null, 2), "utf-8")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Error saving signaling message:", error)
    return NextResponse.json({ success: false })
  }
}
