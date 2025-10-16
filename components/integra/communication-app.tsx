"use client"

import { useState, useEffect, useRef } from "react"
import { apiClient } from "@/lib/api-client"

interface CommunicationAppProps {
  currentUser: string
  deviceId: string
  onClose: () => void
}

export function CommunicationApp({ currentUser, deviceId, onClose }: CommunicationAppProps) {
  const [devices, setDevices] = useState<any[]>([])
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<"messages" | "video">("messages")
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isInCall, setIsInCall] = useState(false)
  const [incomingCall, setIncomingCall] = useState<any | null>(null)
  const [callStatus, setCallStatus] = useState("")
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [hasMediaPermissions, setHasMediaPermissions] = useState<boolean>(true)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  useEffect(() => {
    console.log("[v0] [Comms] Component mounted, current deviceId:", deviceId)
    fetchDevices()
    const interval = setInterval(fetchDevices, 5000)
    return () => clearInterval(interval)
  }, [deviceId])

  useEffect(() => {
    if (!selectedDevice) return

    console.log("[v0] [Comms] Selected device changed:", selectedDevice)
    fetchMessages()
    const interval = setInterval(fetchMessages, 2000)
    return () => clearInterval(interval)
  }, [selectedDevice])

  useEffect(() => {
    const pollNotifications = async () => {
      const notifications = await apiClient.getNotifications(deviceId, true)

      for (const notif of notifications) {
        if (notif.type === "call" && !notif.read) {
          console.log("[v0] [Comms] Incoming call notification:", notif)
          setIncomingCall({
            from: notif.from_device,
            fromName: notif.data?.fromName || "Unknown",
            offer: notif.data?.offer,
          })
          await apiClient.markNotificationAsRead(notif.id)
        }
      }
    }

    pollNotifications()
    const interval = setInterval(pollNotifications, 2000)
    return () => clearInterval(interval)
  }, [deviceId])

  const fetchDevices = async () => {
    console.log("[v0] [Comms] Fetching devices...")
    const allDevices = await apiClient.getDevices()
    console.log("[v0] [Comms] All devices from server:", allDevices)
    console.log("[v0] [Comms] Current deviceId:", deviceId)

    const otherDevices = allDevices.filter((d: any) => {
      console.log("[v0] [Comms] Checking device:", d.id, "vs current:", deviceId, "match:", d.id === deviceId)
      return d.id !== deviceId
    })

    console.log("[v0] [Comms] Filtered devices (excluding self):", otherDevices)
    setDevices(otherDevices)
  }

  const fetchMessages = async () => {
    if (!selectedDevice) return

    console.log("[v0] [Comms] Fetching messages for device:", selectedDevice.id)
    const allMessages = await apiClient.getMessages()
    console.log("[v0] [Comms] All messages from server:", allMessages)

    const relevantMessages = allMessages.filter(
      (m: any) =>
        (m.from === deviceId && m.to === selectedDevice.id) || (m.from === selectedDevice.id && m.to === deviceId),
    )

    console.log("[v0] [Comms] Relevant messages:", relevantMessages)
    setMessages(relevantMessages)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedDevice) return

    const message = {
      id: `msg_${Date.now()}`,
      from: deviceId,
      to: selectedDevice.id,
      text: newMessage.trim(),
      timestamp: Date.now(),
    }

    console.log("[v0] [Comms] Sending message:", message)

    // Optimistic update
    setMessages((prev) => [...prev, message])
    setNewMessage("")

    // Send to server
    const success = await apiClient.sendMessage(message)
    console.log("[v0] [Comms] Message send result:", success)

    // Send notification
    await apiClient.sendNotification(selectedDevice.id, deviceId, "message", "New Message", newMessage.trim())
  }

  const handleStartCall = async () => {
    if (!selectedDevice) return

    try {
      // Check permissions
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionError("Camera/microphone not supported in this browser")
        return
      }

      setCallStatus("Requesting permissions...")
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      })

      peerConnectionRef.current = pc

      // Add local stream tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      // Handle remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      // Create and send offer
      setCallStatus("Calling...")
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Send call notification with offer
      await apiClient.sendNotification(
        selectedDevice.id,
        deviceId,
        "call",
        `Incoming call from ${currentUser}`,
        undefined,
        { offer, fromName: currentUser },
      )

      setIsInCall(true)
      setActiveTab("video")
    } catch (error: any) {
      console.error("[v0] Error starting call:", error)
      if (error.name === "NotAllowedError") {
        setPermissionError("Camera/microphone permission denied")
      } else if (error.name === "NotFoundError") {
        setPermissionError("No camera/microphone found")
      } else {
        setPermissionError("Failed to start call: " + error.message)
      }
    }
  }

  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    localStreamRef.current = null
    peerConnectionRef.current = null
    setIsInCall(false)
    setCallStatus("")
  }

  const handleAcceptCall = async () => {
    if (!incomingCall) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      })

      peerConnectionRef.current = pc

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      // Set remote description from offer
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer))

      // Create answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // Send answer back (would need signaling mechanism)
      setIsInCall(true)
      setActiveTab("video")
      setIncomingCall(null)
      setSelectedDevice(devices.find((d) => d.id === incomingCall.from))
    } catch (error) {
      console.error("[v0] Error accepting call:", error)
      setPermissionError("Failed to accept call")
    }
  }

  const handleDeclineCall = () => {
    setIncomingCall(null)
  }

  return (
    <div className="flex h-full">
      {/* Device List Sidebar */}
      <div className="w-80 border-r border-border bg-card p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Devices</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <i className="fas fa-times text-muted-foreground"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <i className="fas fa-inbox text-4xl mb-2 block"></i>
              <p className="text-sm">No other devices online</p>
            </div>
          ) : (
            devices.map((device) => (
              <button
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedDevice?.id === device.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <i className="fas fa-desktop"></i>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{device.name}</div>
                    <div className="text-xs opacity-70">Online</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedDevice ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedDevice.name}</h3>
                  <p className="text-sm text-muted-foreground">Online</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("messages")}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      activeTab === "messages"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                  >
                    <i className="fas fa-comments mr-2"></i>
                    Messages
                  </button>
                  <button
                    onClick={() => setActiveTab("video")}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      activeTab === "video"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                  >
                    <i className="fas fa-video mr-2"></i>
                    Video Call
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            {activeTab === "messages" ? (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.from === deviceId ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.from === deviceId ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}
                      >
                        <p>{msg.text}</p>
                        <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                {permissionError ? (
                  <div className="text-center max-w-md">
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive mb-4">
                      <i className="fas fa-exclamation-triangle text-2xl mb-2 block"></i>
                      <p className="font-semibold">Permission Required</p>
                      <p className="text-sm mt-1">{permissionError}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Please enable camera and microphone permissions in your browser settings to make video calls.
                    </p>
                  </div>
                ) : isInCall ? (
                  <div className="w-full h-full flex flex-col gap-4">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
                          {selectedDevice.name}
                        </div>
                      </div>
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
                          You
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={handleEndCall}
                        className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                      >
                        <i className="fas fa-phone-slash mr-2"></i>
                        End Call
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <i className="fas fa-video text-6xl text-primary mb-4 block"></i>
                    <h3 className="text-xl font-bold text-foreground mb-2">Call {selectedDevice.name}</h3>
                    <p className="text-muted-foreground mb-6">Start a video call with this device</p>
                    {callStatus && <p className="text-sm text-muted-foreground mb-4">{callStatus}</p>}
                    <button
                      onClick={handleStartCall}
                      disabled={!hasMediaPermissions}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fas fa-video mr-2"></i>
                      Start Call
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <i className="fas fa-comments text-6xl mb-4 block"></i>
              <p>Select a device to start communicating</p>
            </div>
          </div>
        )}
      </div>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-popover border border-border rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <i className="fas fa-video text-primary text-6xl mb-4 block"></i>
              <h3 className="text-2xl font-bold text-foreground mb-2">Incoming Call</h3>
              <p className="text-muted-foreground mb-6">{incomingCall.fromName} is calling you</p>
              <div className="flex gap-4">
                <button
                  onClick={handleDeclineCall}
                  className="flex-1 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  <i className="fas fa-phone-slash mr-2"></i>
                  Decline
                </button>
                <button
                  onClick={handleAcceptCall}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <i className="fas fa-phone mr-2"></i>
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
