import type { CurrentShiftSlot } from '../types'
import { DEFAULT_SLOT_CONFIGS, SHIFTS } from './seed'

// Shift time ranges in minutes from midnight
// A: 7:00-15:30 = 420-930
// B: 15:30-00:00 = 930-1440
// C: 00:00-07:30 = 0-450
const SHIFT_RANGES = [
  { shiftId: 3, name: 'Shift C', start: 0, end: 450 },      // C: 00:00-07:30
  { shiftId: 1, name: 'Shift A', start: 420, end: 930 },     // A: 07:00-15:30
  { shiftId: 2, name: 'Shift B', start: 930, end: 1440 },    // B: 15:30-00:00
]

function minutesSinceMidnight(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes()
}

export function getCurrentShiftSlot(): CurrentShiftSlot | null {
  const mins = minutesSinceMidnight()

  for (const range of SHIFT_RANGES) {
    if (mins >= range.start && mins < range.end) {
      const config = DEFAULT_SLOT_CONFIGS.find(c => c.shiftId === range.shiftId)
      if (!config) return null

      // Find current slot within this shift
      const slotMins = mins - range.start
      let accumulated = 0
      for (const slot of config.slots) {
        accumulated += slot.defaultAvailableTime / 60
        if (slotMins < accumulated) {
          return {
            shiftId: range.shiftId,
            shiftName: range.name,
            slotIndex: slot.slotIndex,
            slotTimeRange: slot.timeRange,
          }
        }
      }

      // If we're past all slots, return last slot
      const lastSlot = config.slots[config.slots.length - 1]
      return {
        shiftId: range.shiftId,
        shiftName: range.name,
        slotIndex: lastSlot.slotIndex,
        slotTimeRange: lastSlot.timeRange,
      }
    }
  }

  return null
}

export function getEligibleShiftIds(date: string): number[] {
  const today = new Date().toISOString().slice(0, 10)
  if (date !== today) {
    // Past or future dates: all shifts
    return [1, 2, 3]
  }

  // Today: current + past shifts
  // Shift order through the day: C (00:00), A (07:00), B (15:30)
  const mins = minutesSinceMidnight()

  if (mins < 450) {
    // In Shift C (00:00-07:30) - only C eligible
    return [3]
  } else if (mins < 930) {
    // In Shift A (07:00-15:30) - C and A eligible
    return [3, 1]
  } else {
    // In Shift B (15:30-00:00) - all eligible
    return [3, 1, 2]
  }
}

export function getSlotsForShift(shiftId: number): Array<{ slotIndex: number; timeRange: string; availableTimeSeconds: number }> {
  const config = DEFAULT_SLOT_CONFIGS.find(c => c.shiftId === shiftId)
  if (!config) return []
  return config.slots.map(s => ({
    slotIndex: s.slotIndex,
    timeRange: s.timeRange,
    availableTimeSeconds: s.defaultAvailableTime,
  }))
}

export function getShiftName(shiftId: number): string {
  return SHIFTS.find(s => s.id === shiftId)?.name || `Shift ${shiftId}`
}

export function formatDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
