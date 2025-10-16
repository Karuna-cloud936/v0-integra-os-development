"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface HeaderProps {
  currentUser: { name: string; role: string } | null
  users: Record<string, { name: string; role: string; passcode: string | null }>
  onUserChange: (role: string) => void
  onOpenTimeClock: () => void
  onOpenSettings: () => void
  onOpenAddApp: () => void
  onOpenEditLayout: () => void
  onRotateScreen: () => void
  isRotated: boolean
  canManage: boolean
  isAdmin: boolean
}

export function IntegraHeader({
  currentUser,
  users,
  onUserChange,
  onOpenTimeClock,
  onOpenSettings,
  onOpenAddApp,
  onOpenEditLayout,
  onRotateScreen,
  isRotated,
  canManage,
  isAdmin,
}: HeaderProps) {
  const [time, setTime] = useState("")

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      const dateStr = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setTime(`${dateStr}  |  ${timeStr}`)
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="bg-card border-b border-border px-6 py-5 flex items-center justify-between flex-shrink-0 z-20 shadow-sm">
      <div className="flex items-center gap-4">
        <Image src="/integra-logo.png" alt="Integra Systems" width={48} height={48} className="object-contain" />
        <h1 className="font-bold text-xl lg:text-2xl text-foreground">Integra OS</h1>
      </div>
      <div className="flex items-center gap-3 lg:gap-4 text-sm">
        <div className="font-semibold text-base lg:text-lg text-muted-foreground hidden sm:block">{time}</div>
        <button
          onClick={onRotateScreen}
          className={`touch-target touch-feedback p-3 rounded-full hover:bg-muted transition-colors ${isRotated ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          title="Rotate Screen"
        >
          <i className="fas fa-rotate text-2xl w-6 h-6 flex items-center justify-center"></i>
        </button>
        <button
          onClick={onOpenTimeClock}
          className="touch-target touch-feedback p-3 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Open Time Clock"
        >
          <i className="fas fa-clock-rotate-left text-2xl w-6 h-6 flex items-center justify-center"></i>
        </button>
        {canManage && (
          <>
            <button
              onClick={onOpenAddApp}
              className="touch-target touch-feedback p-3 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Add new application"
            >
              <i className="fas fa-plus-circle text-2xl w-6 h-6 flex items-center justify-center"></i>
            </button>
            <button
              onClick={onOpenEditLayout}
              className="touch-target touch-feedback p-3 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit Layouts"
            >
              <i className="fas fa-grip text-2xl w-6 h-6 flex items-center justify-center"></i>
            </button>
          </>
        )}
        {isAdmin && (
          <button
            onClick={onOpenSettings}
            className="touch-target touch-feedback p-3 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Settings"
          >
            <i className="fas fa-cog text-2xl w-6 h-6 flex items-center justify-center"></i>
          </button>
        )}
        <div className="relative group ml-2 lg:ml-4">
          <div className="touch-target touch-feedback flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors">
            <i className="fas fa-user-circle text-3xl lg:text-4xl text-muted-foreground"></i>
            <span className="font-semibold text-base lg:text-lg text-foreground hidden md:block">
              {currentUser?.name || "Operator"}
            </span>
            <i className="fas fa-chevron-down text-sm text-muted-foreground"></i>
          </div>
          <div className="hidden group-hover:block absolute right-0 top-full pt-2 w-56 z-50">
            <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
              {Object.values(users).map((user) => (
                <button
                  key={user.role}
                  onClick={() => onUserChange(user.role)}
                  className="touch-target touch-feedback block w-full text-left px-5 py-4 text-base text-card-foreground hover:bg-muted transition-colors"
                >
                  {user.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
