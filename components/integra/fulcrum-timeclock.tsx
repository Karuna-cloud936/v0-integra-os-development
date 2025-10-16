"use client"

import { useState, useEffect } from "react"

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNumber?: string
  pin?: string
}

interface Timer {
  id: string
  employeeId: string
  employeeName: string
  startTime: string
  jobNumber?: string
}

interface FulcrumTimeclockProps {
  onClose: () => void
}

export function FulcrumTimeclock({ onClose }: FulcrumTimeclockProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [activeTimers, setActiveTimers] = useState<Timer[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [pin, setPin] = useState("")
  const [authenticatedEmployee, setAuthenticatedEmployee] = useState<Employee | null>(null)
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [employeesRes, timersRes] = await Promise.all([
        fetch("/api/fulcrum/employees"),
        fetch("/api/fulcrum/timeclock/timers"),
      ])

      const employeesData = await employeesRes.json()
      const timersData = await timersRes.json()

      setEmployees(employeesData.employees || [])
      setActiveTimers(timersData.timers || [])
      setLoading(false)
    } catch (err) {
      console.error("Error loading timeclock data:", err)
      setError("Failed to load timeclock data")
      setLoading(false)
    }
  }

  const handlePinInput = (digit: string) => {
    if (pin.length < 5) {
      const newPin = pin + digit
      setPin(newPin)

      // Auto-authenticate when PIN is 5 digits
      if (newPin.length === 5) {
        authenticateWithPin(newPin)
      }
    }
  }

  const handlePinClear = () => {
    setPin("")
    setError(null)
  }

  const handlePinBackspace = () => {
    setPin(pin.slice(0, -1))
    setError(null)
  }

  const authenticateWithPin = async (pinCode: string) => {
    // Find employee by PIN (in real implementation, this would be server-side)
    const employee = employees.find((emp) => emp.employeeNumber === pinCode)

    if (employee) {
      setAuthenticatedEmployee(employee)
      const timer = activeTimers.find((t) => t.employeeId === employee.id)
      setActiveTimer(timer || null)
      setPin("")
      setError(null)
    } else {
      setError("Invalid PIN")
      setTimeout(() => {
        setPin("")
        setError(null)
      }, 2000)
    }
  }

  const handleClockIn = async () => {
    if (!authenticatedEmployee) return

    setActionLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/fulcrum/timeclock/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: authenticatedEmployee.id }),
      })

      const result = await response.json()

      if (result.success) {
        await loadData()
        setAuthenticatedEmployee(null)
        setActiveTimer(null)
      } else {
        setError(result.error || "Failed to clock in")
      }
    } catch (err) {
      console.error("Error clocking in:", err)
      setError("Failed to clock in")
    } finally {
      setActionLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!activeTimer) return

    setActionLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/fulcrum/timeclock/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timerId: activeTimer.id }),
      })

      const result = await response.json()

      if (result.success) {
        await loadData()
        setAuthenticatedEmployee(null)
        setActiveTimer(null)
      } else {
        setError(result.error || "Failed to clock out")
      }
    } catch (err) {
      console.error("Error clocking out:", err)
      setError("Failed to clock out")
    } finally {
      setActionLoading(false)
    }
  }

  const handleBreak = async () => {
    // Implement break functionality
    setError("Break functionality coming soon")
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  const formatDate = (date: Date) => {
    return date
      .toLocaleDateString("en-US", { weekday: "long", month: "short", day: "2-digit", year: "numeric" })
      .toUpperCase()
  }

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
          <p className="text-muted-foreground">Loading timeclock...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background">
      {/* Left Side - Time Display */}
      <div className="w-1/2 bg-[#2d3142] flex flex-col items-center justify-center text-white relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <i className="fas fa-times text-2xl"></i>
        </button>

        <div className="text-center">
          <div className="text-[120px] font-bold leading-none tracking-tight mb-4">{formatTime(currentTime)}</div>
          <div className="text-xl tracking-wider text-white/80">{formatDate(currentTime)}</div>
        </div>
      </div>

      {/* Right Side - PIN Entry / Clock In/Out */}
      <div className="w-1/2 bg-[#f5f5f5] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          {authenticatedEmployee ? (
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Hey {authenticatedEmployee.firstName}</h2>
                {activeTimer ? (
                  <p className="text-gray-600 text-lg">Clocked in for {formatDuration(activeTimer.startTime)}</p>
                ) : (
                  <p className="text-gray-600 text-lg">Ready to clock in</p>
                )}
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {activeTimer ? (
                  // Show Clock Out when employee has active timer
                  <>
                    <button
                      onClick={handleClockOut}
                      disabled={actionLoading}
                      className="w-full py-6 bg-[#4169e1] text-white rounded-xl text-xl font-semibold hover:bg-[#3557c7] transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Clocking Out...
                        </>
                      ) : (
                        "CLOCK OUT"
                      )}
                    </button>

                    <button
                      onClick={handleBreak}
                      disabled={actionLoading}
                      className="w-full py-6 bg-[#5a6270] text-white rounded-xl text-xl font-semibold hover:bg-[#4a5260] transition-colors disabled:opacity-50"
                    >
                      BREAK
                    </button>
                  </>
                ) : (
                  // Show Clock In when employee has no active timer
                  <button
                    onClick={handleClockIn}
                    disabled={actionLoading}
                    className="w-full py-6 bg-[#4169e1] text-white rounded-xl text-xl font-semibold hover:bg-[#3557c7] transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Clocking In...
                      </>
                    ) : (
                      "CLOCK IN"
                    )}
                  </button>
                )}

                <button
                  onClick={() => {
                    setAuthenticatedEmployee(null)
                    setActiveTimer(null)
                    setError(null)
                  }}
                  className="w-full py-4 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // PIN Entry View
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Your PIN</h2>
                <p className="text-gray-600">Use your 5-digit employee number</p>
              </div>

              <div className="mb-8 h-16 bg-white rounded-xl border-2 border-gray-200 flex items-center justify-center">
                <div className="flex gap-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className={`w-4 h-4 rounded-full ${i < pin.length ? "bg-gray-900" : "bg-gray-300"}`} />
                  ))}
                </div>
              </div>

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinInput(num.toString())}
                    className="h-20 bg-white rounded-xl text-2xl font-semibold text-gray-900 hover:bg-gray-100 transition-colors border-2 border-gray-200"
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={handlePinClear}
                  className="h-20 bg-white rounded-xl text-xl font-semibold text-gray-900 hover:bg-gray-100 transition-colors border-2 border-gray-200"
                >
                  ×
                </button>
                <button
                  onClick={() => handlePinInput("0")}
                  className="h-20 bg-white rounded-xl text-2xl font-semibold text-gray-900 hover:bg-gray-100 transition-colors border-2 border-gray-200"
                >
                  0
                </button>
                <button
                  onClick={handlePinBackspace}
                  className="h-20 bg-white rounded-xl text-xl font-semibold text-gray-900 hover:bg-gray-100 transition-colors border-2 border-gray-200"
                >
                  ←
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
