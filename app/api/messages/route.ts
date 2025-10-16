import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json")

interface Message {
  id: string
  from: string
  to: string
  text: string
  timestamp: number
}

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

export async function GET() {
  try {
    console.log("[v0] [API] GET /api/messages - Fetching messages")
    await ensureDataDir()

    try {
      const data = await fs.readFile(MESSAGES_FILE, "utf-8")
      const messages = JSON.parse(data)
      console.log("[v0] [API] Found messages:", messages.length)
      return NextResponse.json({ messages: messages || [] })
    } catch (error) {
      console.log("[v0] [API] No messages file found, returning empty array")
      return NextResponse.json({ messages: [] })
    }
  } catch (error) {
    console.error("[v0] [API] Error getting messages:", error)
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(request: Request) {
  try {
    const message: Message = await request.json()
    console.log("[v0] [API] POST /api/messages - Saving message:", message)

    await ensureDataDir()

    let messages: Message[] = []
    try {
      const data = await fs.readFile(MESSAGES_FILE, "utf-8")
      messages = JSON.parse(data)
    } catch (error) {
      console.log("[v0] [API] Creating new messages file")
    }

    // Add new message
    messages.push(message)

    // Keep only last 1000 messages
    if (messages.length > 1000) {
      messages = messages.slice(-1000)
    }

    await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf-8")
    console.log("[v0] [API] Message saved successfully. Total messages:", messages.length)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] [API] Error saving message:", error)
    return NextResponse.json({ success: false, error: "Failed to save message" }, { status: 500 })
  }
}
