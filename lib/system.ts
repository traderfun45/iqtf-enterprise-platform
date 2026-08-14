import { apiGet } from "./api"

export type SystemStatus = {
  service: string
  status: "healthy" | "unhealthy"
  process: {
    pid: number
    uptimeSeconds: number
    startedAt: string
    nodeVersion: string
    platform: string
    arch: string
  }
  memory: {
    rssBytes: number
    heapUsedBytes: number
    heapTotalBytes: number
    externalBytes: number
    arrayBuffersBytes: number
  }
  cpu: {
    userMicros: number
    systemMicros: number
  }
  system: {
    hostname: string
    loadAverage: number[]
    cpuCount: number
    totalMemoryBytes: number
    freeMemoryBytes: number
  }
  services: {
    api: string
    market: string
    cache: string
    watchdog: string
  }
  timestamp: string
}

export async function getSystemStatus(): Promise<SystemStatus> {
  return apiGet<SystemStatus>("/api/system/status")
}
