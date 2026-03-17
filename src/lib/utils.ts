import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(1)}%`
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export function getOeeClass(oee: number): string {
  if (oee >= 85) return 'oee-excellent'
  if (oee >= 70) return 'oee-good'
  if (oee >= 50) return 'oee-average'
  return 'oee-poor'
}

export function getStationStatusClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'running': return 'station-running'
    case 'idle': return 'station-idle'
    case 'alarm': return 'station-alarm'
    case 'stopped': return 'station-stopped'
    case 'offline': return 'station-offline'
    default: return 'station-idle'
  }
}
