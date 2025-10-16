import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiKey = process.env.FULCRUM_API_KEY

    if (!apiKey) {
      console.log("[v0] [API] No FULCRUM_API_KEY found")
      return NextResponse.json({ employees: [] })
    }

    console.log("[v0] [API] Fetching employees from Fulcrum API")

    const response = await fetch("https://api.fulcrumpro.com/api/v2/employees", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("[v0] [API] Failed to fetch employees:", response.status, response.statusText)
      return NextResponse.json({ employees: [] })
    }

    const employees = await response.json()
    console.log("[v0] [API] Fetched", employees.length, "employees")

    return NextResponse.json({ employees })
  } catch (error) {
    console.error("[v0] [API] Error fetching employees:", error)
    return NextResponse.json({ employees: [] })
  }
}
