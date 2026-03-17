import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Operator, Shift, ProductionLine, Part, ProductionOrder } from '@/types'

interface SessionState {
  operator: Operator | null
  shift: Shift | null
  productionLine: ProductionLine | null
  part: Part | null
  productionOrder: ProductionOrder | null
  setOperator: (operator: Operator | null) => void
  setShift: (shift: Shift | null) => void
  setProductionLine: (line: ProductionLine | null) => void
  setPart: (part: Part | null) => void
  setProductionOrder: (order: ProductionOrder | null) => void
  clearSession: () => void
  isSessionComplete: () => boolean
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      operator: null,
      shift: null,
      productionLine: null,
      part: null,
      productionOrder: null,
      setOperator: (operator) => set({ operator }),
      setShift: (shift) => set({ shift }),
      setProductionLine: (productionLine) => set({ productionLine }),
      setPart: (part) => set({ part }),
      setProductionOrder: (productionOrder) => set({ productionOrder }),
      clearSession: () =>
        set({
          operator: null,
          shift: null,
          productionLine: null,
          part: null,
          productionOrder: null,
        }),
      isSessionComplete: () => {
        const state = get()
        return !!(state.operator && state.shift && state.productionLine && state.part)
      },
    }),
    {
      name: 'ask-session',
    }
  )
)
