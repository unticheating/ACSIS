import { Input } from '@/components/ui/input.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Plus, Trash2 } from 'lucide-react'
import { emptyMatchingPair } from '@/lib/matchingQuestion.js'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * @param {{\r
 *   pairs: { left: string, right: string }[],\r
 *   onChange: (pairs: { left: string, right: string }[]) => void,\r
 * }} props
 */
export default function MatchingPairEditor({ pairs, onChange }) {
  const rows = pairs.length ? pairs : [emptyMatchingPair()]

  function updateRow(index, field, value) {
    const next = rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    onChange(next)
  }

  function addRow() {
    onChange([...rows, emptyMatchingPair()])
  }

  function removeRow(index) {
    if (rows.length <= 1) {
      onChange([emptyMatchingPair()])
      return
    }
    onChange(rows.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
        <span>Left column (prompt)</span>
        <span>Right column (match)</span>
        <span className="sr-only">Actions</span>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input
            type="text"
            placeholder={`Prompt ${index + 1}`}
            value={row.left}
            onChange={(e) => updateRow(index, 'left', e.target.value)}
          />
          <Input
            type="text"
            placeholder={`Answer ${index + 1}`}
            value={row.right}
            onChange={(e) => updateRow(index, 'right', e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeRow(index)}
            aria-label={`Remove pair ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add pair
      </Button>
    </div>
  )
}

/* ─── Connecting-Line Student Input ─── */

const LINE_COLOR_DEFAULT = 'rgba(74,222,128,0.55)'
const LINE_COLOR_HOVER = 'rgba(74,222,128,0.9)'
const LINE_COLOR_SELECTED = '#22c55e'
const LINE_COLOR_PENDING = 'rgba(234,179,8,0.7)'

/**
 * @param {{\r
 *   pairs: { left: string, right: string }[],\r
 *   rightOptions: string[],\r
 *   value: Record<string, string>,\r
 *   onChange: (map: Record<string, string>) => void,\r
 *   disabled?: boolean,\r
 * }} props
 */
export function MatchingQuestionInput({ pairs, rightOptions, value, onChange, disabled = false }) {
  const containerRef = useRef(null)
  const leftRefs = useRef([])
  const rightRefs = useRef([])
  const svgRef = useRef(null)

  // selectedLeft: the left key currently pending a connection
  const [selectedLeft, setSelectedLeft] = useState(null)
  // hoveredLeft / hoveredRight: for highlight
  const [hoveredLeft, setHoveredLeft] = useState(null)
  const [hoveredRight, setHoveredRight] = useState(null)
  // svgSize: tracks container dimensions for the SVG
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 })
  // linePositions: computed { x1,y1,x2,y2 } per connected pair
  const [linePositions, setLinePositions] = useState([])

  // Build reverse map: rightValue -> leftKey
  const reverseMap = Object.fromEntries(
    Object.entries(value).map(([l, r]) => [r, l])
  )

  const recomputeLines = useCallback(() => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const lines = []
    for (const [leftKey, rightVal] of Object.entries(value)) {
      if (!rightVal) continue
      const leftIdx = pairs.findIndex((p) => p.left === leftKey)
      const rightIdx = rightOptions.indexOf(rightVal)
      if (leftIdx === -1 || rightIdx === -1) continue
      const leftEl = leftRefs.current[leftIdx]
      const rightEl = rightRefs.current[rightIdx]
      if (!leftEl || !rightEl) continue
      const lRect = leftEl.getBoundingClientRect()
      const rRect = rightEl.getBoundingClientRect()
      lines.push({
        leftKey,
        rightVal,
        x1: lRect.right - containerRect.left,
        y1: lRect.top + lRect.height / 2 - containerRect.top,
        x2: rRect.left - containerRect.left,
        y2: rRect.top + rRect.height / 2 - containerRect.top,
      })
    }
    setLinePositions(lines)
    setSvgSize({
      w: containerRect.width,
      h: containerRect.height,
    })
  }, [value, pairs, rightOptions])

  useLayoutEffect(() => {
    recomputeLines()
  }, [recomputeLines])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => recomputeLines())
    ro.observe(el)
    return () => ro.disconnect()
  }, [recomputeLines])

  function handleLeftClick(leftKey) {
    if (disabled) return
    if (selectedLeft === leftKey) {
      // deselect
      setSelectedLeft(null)
      return
    }
    setSelectedLeft(leftKey)
  }

  function handleRightClick(rightVal) {
    if (disabled) return
    if (selectedLeft == null) {
      // Try to remove existing connection for this right item
      const existingLeft = reverseMap[rightVal]
      if (existingLeft) {
        const next = { ...value }
        delete next[existingLeft]
        onChange(next)
      }
      return
    }
    // Connect selectedLeft -> rightVal
    const next = { ...value }
    // Remove any existing connection that already uses this rightVal
    const oldLeft = reverseMap[rightVal]
    if (oldLeft && oldLeft !== selectedLeft) {
      delete next[oldLeft]
    }
    // Remove selectedLeft's old connection
    delete next[selectedLeft]
    next[selectedLeft] = rightVal
    onChange(next)
    setSelectedLeft(null)
  }

  function handleRemoveLine(leftKey) {
    if (disabled) return
    const next = { ...value }
    delete next[leftKey]
    onChange(next)
  }

  const connectedRights = new Set(Object.values(value))

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', userSelect: 'none' }}
      className="w-full"
      aria-label="Matching question: click a left item, then click a right item to connect them"
    >
      {/* SVG overlay for lines */}
      <svg
        ref={svgRef}
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          width: svgSize.w,
          height: svgSize.h,
          pointerEvents: 'none',
          zIndex: 10,
          overflow: 'visible',
        }}
      >
        <defs>
          <filter id="matching-line-glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Pending connection line from selected left to hovered right */}
        {selectedLeft != null && hoveredRight != null && (() => {
          const leftIdx = pairs.findIndex((p) => p.left === selectedLeft)
          const rightIdx = rightOptions.indexOf(hoveredRight)
          if (leftIdx === -1 || rightIdx === -1) return null
          const leftEl = leftRefs.current[leftIdx]
          const rightEl = rightRefs.current[rightIdx]
          if (!leftEl || !rightEl) return null
          const cRect = containerRef.current?.getBoundingClientRect()
          if (!cRect) return null
          const lRect = leftEl.getBoundingClientRect()
          const rRect = rightEl.getBoundingClientRect()
          const x1 = lRect.right - cRect.left
          const y1 = lRect.top + lRect.height / 2 - cRect.top
          const x2 = rRect.left - cRect.left
          const y2 = rRect.top + rRect.height / 2 - cRect.top
          const cx = (x1 + x2) / 2
          return (
            <path
              d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={LINE_COLOR_PENDING}
              strokeWidth="2.5"
              strokeDasharray="6 4"
              filter="url(#matching-line-glow)"
            />
          )
        })()}

        {/* Committed connection lines */}
        {linePositions.map(({ leftKey, x1, y1, x2, y2 }) => {
          const isHovered = hoveredLeft === leftKey || hoveredRight === value[leftKey]
          const isSelectedLeft = selectedLeft === leftKey
          const cx = (x1 + x2) / 2
          const stroke = isSelectedLeft
            ? LINE_COLOR_SELECTED
            : isHovered
              ? LINE_COLOR_HOVER
              : LINE_COLOR_DEFAULT
          return (
            <g key={leftKey}>
              {/* Wider invisible hit area */}
              <path
                d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="transparent"
                strokeWidth="16"
                style={{ pointerEvents: disabled ? 'none' : 'stroke', cursor: 'pointer' }}
                onClick={() => handleRemoveLine(leftKey)}
              />
              <path
                d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={stroke}
                strokeWidth={isHovered || isSelectedLeft ? 2.5 : 2}
                filter={isHovered || isSelectedLeft ? 'url(#matching-line-glow)' : undefined}
                style={{ pointerEvents: 'none', transition: 'stroke 0.15s' }}
              />
              {/* Mid-point X button to remove connection */}
              {isHovered && !disabled && (() => {
                const mx = cx
                const my = (y1 + y2) / 2
                return (
                  <g style={{ pointerEvents: 'all', cursor: 'pointer' }} onClick={() => handleRemoveLine(leftKey)}>
                    <circle cx={mx} cy={my} r={9} fill="rgba(220,38,38,0.85)" />
                    <line x1={mx - 4} y1={my - 4} x2={mx + 4} y2={my + 4} stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1={mx + 4} y1={my - 4} x2={mx - 4} y2={my + 4} stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  </g>
                )
              })()}
            </g>
          )
        })}
      </svg>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 1fr', gap: 0 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pairs.map((pair, idx) => {
            const isConnected = Boolean(value[pair.left])
            const isSelected = selectedLeft === pair.left
            const isHov = hoveredLeft === pair.left
            return (
              <button
                key={`left-${idx}`}
                ref={(el) => { leftRefs.current[idx] = el }}
                type="button"
                disabled={disabled}
                onClick={() => handleLeftClick(pair.left)}
                onMouseEnter={() => setHoveredLeft(pair.left)}
                onMouseLeave={() => setHoveredLeft(null)}
                aria-pressed={isSelected}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: `2px solid ${
                    isSelected
                      ? 'var(--acsis-brand)'
                      : isConnected
                        ? 'rgba(74,222,128,0.4)'
                        : isHov
                          ? 'rgba(74,222,128,0.25)'
                          : 'var(--border-default, rgba(255,255,255,0.12))'
                  }`,
                  background: isSelected
                    ? 'color-mix(in srgb, var(--acsis-brand) 18%, transparent)'
                    : isConnected
                      ? 'rgba(74,222,128,0.08)'
                      : 'var(--bg-elevated, rgba(0,0,0,0.05))',
                  cursor: disabled ? 'default' : 'pointer',
                  textAlign: 'left',
                  color: 'var(--fg-default)',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'border-color 0.15s, background 0.15s',
                  minHeight: 48,
                  width: '100%',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Dot indicator */}
                <span style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: isConnected ? 'var(--acsis-brand)' : 'transparent',
                  border: `2px solid ${isConnected ? 'var(--acsis-brand)' : 'rgba(255,255,255,0.25)'}`,
                  transition: 'background 0.15s, border-color 0.15s',
                }} />
                <span style={{ flex: 1, minWidth: 0 }}>{pair.left}</span>
              </button>
            )
          })}
        </div>

        {/* Center gap — lines go through here */}
        <div />

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rightOptions.map((opt, idx) => {
            const isConnected = connectedRights.has(opt)
            const isHov = hoveredRight === opt
            const isAvailable = !isConnected
            return (
              <button
                key={`right-${idx}`}
                ref={(el) => { rightRefs.current[idx] = el }}
                type="button"
                disabled={disabled}
                onClick={() => handleRightClick(opt)}
                onMouseEnter={() => setHoveredRight(opt)}
                onMouseLeave={() => setHoveredRight(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: `2px solid ${
                    isConnected
                      ? 'rgba(74,222,128,0.4)'
                      : selectedLeft != null && isHov
                        ? 'var(--acsis-brand)'
                        : isHov
                          ? 'rgba(74,222,128,0.25)'
                          : 'var(--border-default, rgba(255,255,255,0.12))'
                  }`,
                  background:
                    isConnected
                      ? 'rgba(74,222,128,0.08)'
                      : selectedLeft != null && isHov
                        ? 'color-mix(in srgb, var(--acsis-brand) 18%, transparent)'
                        : 'var(--bg-elevated, rgba(0,0,0,0.05))',
                  cursor: disabled ? 'default' : 'pointer',
                  textAlign: 'left',
                  color: 'var(--fg-default)',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'border-color 0.15s, background 0.15s',
                  minHeight: 48,
                  width: '100%',
                  position: 'relative',
                  zIndex: 1,
                  opacity: selectedLeft != null && isConnected && reverseMap[opt] !== selectedLeft ? 0.55 : 1,
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>{opt}</span>
                <span style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: isConnected ? 'var(--acsis-brand)' : 'transparent',
                  border: `2px solid ${isConnected ? 'var(--acsis-brand)' : 'rgba(255,255,255,0.25)'}`,
                  transition: 'background 0.15s, border-color 0.15s',
                }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Helper text */}
      {!disabled && (
        <p style={{
          marginTop: 14,
          fontSize: 12,
          color: 'rgba(255,255,255,0.45)',
          textAlign: 'center',
        }}>
          {selectedLeft != null
            ? `"${selectedLeft}" selected — click a right item to connect`
            : 'Click a left item, then click a right item to connect them. Click a line to remove it.'}
        </p>
      )}
    </div>
  )
}

