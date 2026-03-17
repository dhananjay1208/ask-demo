const PREFIX = 'ask-demo:'
const SEEDED_KEY = `${PREFIX}seeded`

function key(table: string): string {
  return `${PREFIX}${table}`
}

function counterKey(table: string): string {
  return `${PREFIX}${table}:nextId`
}

function readTable<T>(table: string): T[] {
  try {
    const raw = localStorage.getItem(key(table))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeTable<T>(table: string, data: T[]): void {
  localStorage.setItem(key(table), JSON.stringify(data))
}

function nextId(table: string): number {
  const k = counterKey(table)
  const current = parseInt(localStorage.getItem(k) || '0', 10)
  const next = current + 1
  localStorage.setItem(k, String(next))
  return next
}

function initCounter(table: string, startFrom: number): void {
  localStorage.setItem(counterKey(table), String(startFrom))
}

export const store = {
  getAll<T extends { id: number }>(table: string, filter?: (item: T) => boolean): T[] {
    const items = readTable<T>(table)
    return filter ? items.filter(filter) : items
  },

  getById<T extends { id: number }>(table: string, id: number): T | undefined {
    return readTable<T>(table).find(item => item.id === id)
  },

  create<T extends { id: number }>(table: string, item: Omit<T, 'id'> & { id?: number }): T {
    const items = readTable<T>(table)
    const newItem = { ...item, id: item.id ?? nextId(table) } as T
    items.push(newItem)
    writeTable(table, items)
    return newItem
  },

  createMany<T extends { id: number }>(table: string, newItems: Array<Omit<T, 'id'>>): T[] {
    const items = readTable<T>(table)
    const created: T[] = []
    for (const item of newItems) {
      const newItem = { ...item, id: nextId(table) } as T
      items.push(newItem)
      created.push(newItem)
    }
    writeTable(table, items)
    return created
  },

  update<T extends { id: number }>(table: string, id: number, updates: Partial<T>): T | undefined {
    const items = readTable<T>(table)
    const idx = items.findIndex(item => item.id === id)
    if (idx === -1) return undefined
    items[idx] = { ...items[idx], ...updates }
    writeTable(table, items)
    return items[idx]
  },

  delete(table: string, id: number): boolean {
    const items = readTable<{ id: number }>(table)
    const filtered = items.filter(item => item.id !== id)
    if (filtered.length === items.length) return false
    writeTable(table, filtered)
    return true
  },

  deleteWhere<T>(table: string, predicate: (item: T) => boolean): number {
    const items = readTable<T>(table)
    const remaining = items.filter(item => !predicate(item))
    const deleted = items.length - remaining.length
    writeTable(table, remaining)
    return deleted
  },

  count<T>(table: string, filter?: (item: T) => boolean): number {
    const items = readTable<T>(table)
    return filter ? items.filter(filter).length : items.length
  },

  isSeeded(): boolean {
    return localStorage.getItem(SEEDED_KEY) === 'true'
  },

  markSeeded(): void {
    localStorage.setItem(SEEDED_KEY, 'true')
  },

  reset(): void {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX))
    allKeys.forEach(k => localStorage.removeItem(k))
  },

  initCounter: initCounter,
  nextId: nextId,
}
