import { NextResponse } from "next/server"

export async function GET() {
  console.log("[v0] [API] GET /api/fulcrum/operations - Fetching real-time operations")

  const apiKey = process.env.FULCRUM_API_KEY

  if (!apiKey) {
    console.log("[v0] [API] No FULCRUM_API_KEY found")
    return NextResponse.json(
      { error: "Fulcrum API key not configured. Please add FULCRUM_API_KEY to environment variables." },
      { status: 500 },
    )
  }

  try {
    const jobsResponse = await fetch(
      "https://api.fulcrumpro.com/api/v2/jobs?statuses=inProgress&statuses=scheduled&includeOperations=true",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    )

    if (!jobsResponse.ok) {
      console.log("[v0] [API] Fulcrum API error:", jobsResponse.status, jobsResponse.statusText)
      return NextResponse.json({ error: "Failed to fetch data from Fulcrum API" }, { status: jobsResponse.status })
    }

    const jobsData = await jobsResponse.json()
    console.log("[v0] [API] Fetched", jobsData.length || 0, "jobs from Fulcrum")

    const timeClockResponse = await fetch("https://api.fulcrumpro.com/api/v2/time-clock/timers", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    let activeTimers = []
    if (timeClockResponse.ok) {
      activeTimers = await timeClockResponse.json()
      console.log("[v0] [API] Fetched", activeTimers.length || 0, "active timers")
    }

    const operations = []
    for (const job of jobsData || []) {
      if (job.operations && Array.isArray(job.operations)) {
        for (const operation of job.operations) {
          // Find personnel working on this operation
          const personnel = activeTimers.filter(
            (timer) => timer.job?.id === job.id && timer.operation?.id === operation.id,
          )

          operations.push({
            id: operation.id,
            status: operation.status || "unknown",
            machine: operation.equipment?.name || "Unknown Machine",
            jobNumber: job.jobNumber,
            partNumber: job.itemToMake?.partNumber || "",
            description: operation.description || job.itemToMake?.description || "",
            personnel: personnel.map((p) => ({
              id: p.employee?.id,
              name: `${p.employee?.firstName || ""} ${p.employee?.lastName || ""}`.trim(),
              avatar: p.employee?.avatarUrl || null,
            })),
            timeSpent: operation.actualTime || 0,
            timeEstimated: operation.estimatedTime || 0,
            completionPercentage: operation.percentComplete || 0,
            isLate: operation.isLate || false,
          })
        }
      }
    }

    return NextResponse.json({
      operations,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] [API] Error fetching Fulcrum data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
