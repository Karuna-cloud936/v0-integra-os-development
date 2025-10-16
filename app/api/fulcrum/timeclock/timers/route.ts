import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiKey = process.env.FULCRUM_API_KEY

    if (!apiKey) {
      console.log("[v0] [API] No FULCRUM_API_KEY found")
      return NextResponse.json({ timers: [] })
    }

    const response = await fetch("https://api.fulcrumpro.com/api/v2/time-clock/timers", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("[v0] [API] Failed to fetch timers:", response.status)
      return NextResponse.json({ timers: [] })
    }

    const timers = await response.json()
    return NextResponse.json({ timers })
  } catch (error) {
    console.error("[v0] [API] Error fetching timers:", error)
    return NextResponse.json({ timers: [] })
  }
}
