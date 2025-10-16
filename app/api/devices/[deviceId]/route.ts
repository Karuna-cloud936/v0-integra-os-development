import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

const DEVICES_PREFIX = "integra-devices/"

export async function PATCH(request: Request, { params }: { params: { deviceId: string } }) {
  try {
    const { deviceName } = await request.json()
    const { deviceId } = params

    if (!deviceName) {
      return NextResponse.json({ error: "Device name is required" }, { status: 400 })
    }

    // Get existing device data
    const blobUrl = `${DEVICES_PREFIX}${deviceId}.json`

    let existingDevice = {
      id: deviceId,
      registeredAt: new Date().toISOString(),
    }

    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const response = await fetch(`https://blob.vercel-storage.com/${blobUrl}`)
        if (response.ok) {
          existingDevice = await response.json()
        }
      }
    } catch (error) {
      console.log("[API] No existing device found, creating new")
    }

    const updatedDevice = {
      ...existingDevice,
      name: deviceName,
      updatedAt: new Date().toISOString(),
    }

    // Save updated device to Blob storage if available
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await put(blobUrl, JSON.stringify(updatedDevice), {
        access: "public",
        contentType: "application/json",
      })
    }

    return NextResponse.json({ success: true, device: updatedDevice })
  } catch (error) {
    console.error("[API] Error updating device:", error)
    return NextResponse.json({ error: "Failed to update device" }, { status: 500 })
  }
}
