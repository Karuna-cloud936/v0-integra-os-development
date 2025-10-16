import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const apiKey = process.env.FULCRUM_API_KEY

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API key not configured" }, { status: 500 })
    }

    const { timerId } = await request.json()

    if (!timerId) {
      return NextResponse.json({ success: false, error: "Timer ID required" }, { status: 400 })
    }

    console.log("[v0] [API] Clocking out timer:", timerId)

    const response = await fetch("https://api.fulcrumpro.com/api/v2/time-clock/clock-out", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ timerId }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] [API] Clock out failed:", response.status, errorText)
      return NextResponse.json({ success: false, error: "Failed to clock out" }, { status: response.status })
    }

    const result = await response.json()
    console.log("[v0] [API] Clock out successful")

    return NextResponse.json({ success: true, timer: result })
  } catch (error) {
    console.error("[v0] [API] Error clocking out:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
