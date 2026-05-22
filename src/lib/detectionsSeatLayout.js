export const SEAT_COUNT = 40
export const SEAT_LAYOUT_STORAGE = 'acsis.detections.seatLayout'
export const SEAT_SETTINGS_STORAGE = 'acsis.detections.seatSettings'

export const FILL_MODES = {
  LEFT: 'left',
  RIGHT: 'right',
  SNAKE_LEFT: 'snake_left',
  SNAKE_RIGHT: 'snake_right',
  RANDOM: 'random',
}

/** @deprecated aliases saved in older browsers */
const LEGACY_FILL_MODES = {
  snake: FILL_MODES.SNAKE_LEFT,
}

export const DEFAULT_SEAT_SETTINGS = {
  sortBy: 'surname',
  fillMode: FILL_MODES.SNAKE_LEFT,
}

function normalizeFillMode(mode) {
  if (Object.values(FILL_MODES).includes(mode)) return mode
  if (mode && LEGACY_FILL_MODES[mode]) return LEGACY_FILL_MODES[mode]
  return DEFAULT_SEAT_SETTINGS.fillMode
}

const ROWS = 5
const COLS_PER_ROW = 8

function layoutStorageKey(classId, examId) {
  return `${SEAT_LAYOUT_STORAGE}:${classId}:${examId}`
}

function settingsStorageKey(classId, examId) {
  return `${SEAT_SETTINGS_STORAGE}:${classId}:${examId}`
}

export function emptySeat(index) {
  return { id: `empty-${index}`, tone: 'empty', strikes: 0, violations: [], seatIndex: index }
}

export function loadSeatLayout(classId, examId) {
  try {
    const raw = localStorage.getItem(layoutStorageKey(classId, examId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveSeatLayout(classId, examId, seats) {
  const layout = seats.map((s) => (s.tone === 'empty' ? null : s.id))
  localStorage.setItem(layoutStorageKey(classId, examId), JSON.stringify(layout))
}

export function loadSeatSettings(classId, examId) {
  try {
    const raw = localStorage.getItem(settingsStorageKey(classId, examId))
    if (!raw) return { ...DEFAULT_SEAT_SETTINGS }
    const parsed = JSON.parse(raw)
    const fillMode = normalizeFillMode(parsed?.fillMode)
    return { sortBy: 'surname', fillMode }
  } catch {
    return { ...DEFAULT_SEAT_SETTINGS }
  }
}

export function saveSeatSettings(classId, examId, settings) {
  localStorage.setItem(settingsStorageKey(classId, examId), JSON.stringify(settings))
}

function shuffleArray(items) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Order of grid indices (0–39) when placing students into seats. */
export function getSeatFillOrder(fillMode) {
  const mode = normalizeFillMode(fillMode)
  const linear = []
  for (let r = 0; r < ROWS; r++) {
    let cols = Array.from({ length: COLS_PER_ROW }, (_, c) => r * COLS_PER_ROW + c)
    if (mode === FILL_MODES.SNAKE_LEFT && r % 2 === 1) {
      cols = cols.reverse()
    } else if (mode === FILL_MODES.SNAKE_RIGHT && r % 2 === 0) {
      cols = cols.reverse()
    } else if (mode === FILL_MODES.RIGHT) {
      cols = cols.reverse()
    }
    // LEFT: every row left → right (default column order)
    linear.push(...cols)
  }
  if (mode === FILL_MODES.RANDOM) {
    return shuffleArray(linear)
  }
  return linear
}

export function sortSeatsBySurname(seats) {
  return [...seats].sort((a, b) => {
    const la = (a.lastName || '').toLocaleLowerCase()
    const lb = (b.lastName || '').toLocaleLowerCase()
    if (la !== lb) return la.localeCompare(lb, undefined, { sensitivity: 'base' })
    return (a.firstName || '')
      .toLocaleLowerCase()
      .localeCompare((b.firstName || '').toLocaleLowerCase(), undefined, { sensitivity: 'base' })
  })
}

export function arrangeSeatsBySettings(rosterSeats, settings) {
  const ordered = sortSeatsBySurname(rosterSeats)
  const fillOrder = getSeatFillOrder(settings.fillMode)
  const grid = Array.from({ length: SEAT_COUNT }, (_, i) => emptySeat(i))
  ordered.forEach((seat, i) => {
    if (i >= fillOrder.length) return
    const idx = fillOrder[i]
    grid[idx] = { ...seat, seatIndex: idx }
  })
  return grid
}

export function mergeLayoutWithRoster(savedLayout, rosterSeats) {
  const byId = new Map(rosterSeats.map((s) => [s.id, s]))
  const placed = new Set()
  const grid = []

  for (let i = 0; i < SEAT_COUNT; i++) {
    const key = savedLayout?.[i]
    if (key && byId.has(key) && !placed.has(key)) {
      placed.add(key)
      grid.push({ ...byId.get(key), seatIndex: i })
    } else {
      grid.push(emptySeat(i))
    }
  }

  for (const seat of rosterSeats) {
    if (placed.has(seat.id)) continue
    const slot = grid.findIndex((s) => s.tone === 'empty')
    if (slot < 0) break
    grid[slot] = { ...seat, seatIndex: slot }
    placed.add(seat.id)
  }

  return grid
}

export function buildSeatGridFromRoster(rosterSeats, classId, examId, settings) {
  const savedLayout =
    classId != null && examId != null ? loadSeatLayout(classId, examId) : null
  if (savedLayout?.length) {
    return mergeLayoutWithRoster(savedLayout, rosterSeats)
  }
  return arrangeSeatsBySettings(rosterSeats, settings)
}

export function moveSeatAt(seats, fromIdx, toIdx) {
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return seats
  const next = [...seats]
  const from = next[fromIdx]
  const to = next[toIdx]
  if (!from || from.tone === 'empty') return seats

  if (to?.tone === 'empty') {
    next[toIdx] = { ...from, seatIndex: toIdx }
    next[fromIdx] = emptySeat(fromIdx)
  } else {
    next[fromIdx] = { ...to, seatIndex: fromIdx }
    next[toIdx] = { ...from, seatIndex: toIdx }
  }
  return next
}
