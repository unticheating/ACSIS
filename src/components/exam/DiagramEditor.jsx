import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useEdgesState,
  useNodesState,
  Panel,
  ReactFlowProvider,
  Handle,
  Position,
  useReactFlow,
  MarkerType,
  ConnectionMode,
  reconnectEdge,
  NodeResizer,
  getSmoothStepPath,
  BaseEdge,
  EdgeLabelRenderer,
  useUpdateNodeInternals,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './diagram-editor.css'
import { Input } from '@/components/ui/input.jsx'
import { labelForDiagramVariant } from '@/lib/diagramQuestion.js'
import { Trash2 } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext.jsx'

/* ─── Cardinality Config ──────────────────────────────── */
const CARDINALITY_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'one', label: 'One  ( | )' },
  { value: 'many', label: 'Many  ( ⋈ )' },
  { value: 'zero-one', label: 'Zero or One  ( O| )' },
  { value: 'zero-many', label: 'Zero or Many  ( O⋈ )' },
]

const CARD_SYMBOLS = {
  'none': '',
  'one': '1',
  'many': 'N',
  'zero-one': '0..1',
  'zero-many': '0..N',
}

/* Draw crow's foot SVG marks inline at a given point/direction.
   `pos` is Position.Left/Right/Top/Bottom — the direction the edge leaves/enters the node.
   Fingers (fan) are drawn AT the node edge, convergence tip further along the line.
   This is standard crow's foot ERD notation. */
function CrowsFoot({ x, y, pos, card, color = '#6b7280' }) {
  if (!card || card === 'none') return null

  const stroke = { stroke: color, strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round' }
  const fillC = { fill: 'var(--background)', stroke: color, strokeWidth: 1.5 }

  // Unit vector pointing AWAY from the node along the edge
  let ax = 0, ay = 0
  if (pos === Position.Right) { ax = 1; ay = 0 }
  if (pos === Position.Left) { ax = -1; ay = 0 }
  if (pos === Position.Bottom) { ax = 0; ay = 1 }
  if (pos === Position.Top) { ax = 0; ay = -1 }

  // Perpendicular unit vector
  const px = -ay, py = ax

  const h = 8    // half-width of the fan spread
  const near = 3  // base (fan start) distance from node — fingers touch near here
  const far = 16 // tip (convergence) distance from node — where lines meet on the edge side

  // Fan base (near the node — this is where the "fingers" are)
  const bx = x + ax * near
  const by = y + ay * near
  // Tip (further along the line — convergence point)
  const tx = x + ax * far
  const ty = y + ay * far

  switch (card) {
    case 'one':
      // Two parallel bars close to the node (perpendicular to the edge)
      return (
        <g>
          <line x1={bx + px * h} y1={by + py * h} x2={bx - px * h} y2={by - py * h}       {...stroke} />
          <line x1={bx + ax * 5 + px * h} y1={by + ay * 5 + py * h} x2={bx + ax * 5 - px * h} y2={by + ay * 5 - py * h} {...stroke} />
          {/* stem connecting to main edge */}
          <line x1={bx} y1={by} x2={tx} y2={ty} {...stroke} />
        </g>
      )

    case 'many':
      // Fan: three lines spreading from the convergence tip back toward the node
      return (
        <g>
          {/* outer two fingers fan out to the base spread */}
          <line x1={tx} y1={ty} x2={bx + px * h} y2={by + py * h} {...stroke} />
          <line x1={tx} y1={ty} x2={bx} y2={by}          {...stroke} />
          <line x1={tx} y1={ty} x2={bx - px * h} y2={by - py * h} {...stroke} />
        </g>
      )

    case 'zero-one':
      // Circle (zero) + single bar (one)
      return (
        <g>
          {/* circle sitting on the line between far and node */}
          <circle cx={tx + ax * 6} cy={ty + ay * 6} r={4} {...fillC} />
          {/* single bar near node */}
          <line x1={bx + px * h} y1={by + py * h} x2={bx - px * h} y2={by - py * h} {...stroke} />
          <line x1={bx} y1={by} x2={tx + ax * 2} y2={ty + ay * 2} {...stroke} />
        </g>
      )

    case 'zero-many':
      // Circle (zero) + crow's foot (many)
      return (
        <g>
          {/* circle sitting further along the line */}
          <circle cx={tx + ax * 6} cy={ty + ay * 6} r={4} {...fillC} />
          {/* crow's foot fan toward node */}
          <line x1={tx} y1={ty} x2={bx + px * h} y2={by + py * h} {...stroke} />
          <line x1={tx} y1={ty} x2={bx} y2={by}          {...stroke} />
          <line x1={tx} y1={ty} x2={bx - px * h} y2={by - py * h} {...stroke} />
        </g>
      )

    default:
      return null
  }
}

/* ─── Custom Cardinality Edge ─────────────────────────── */
const CardinalityEdge = ({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, selected,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
  })

  const strokeColor = selected ? '#3b82f6' : 'var(--foreground)'
  const cardStart = data?.cardStart || 'none'
  const cardEnd = data?.cardEnd || 'none'

  return (
    <>
      {/* The line itself */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: strokeColor, strokeWidth: selected ? 2 : 1.5, cursor: 'pointer' }}
      />

      {/* Crow's foot at source end */}
      <CrowsFoot x={sourceX} y={sourceY} pos={sourcePosition} card={cardStart} color={strokeColor} />

      {/* Crow's foot at target end */}
      <CrowsFoot x={targetX} y={targetY} pos={targetPosition} card={cardEnd} color={strokeColor} />

      {/* Text cardinality labels */}
      {(cardStart !== 'none' || cardEnd !== 'none') && (
        <EdgeLabelRenderer>
          {cardStart !== 'none' && (
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%,-50%) translate(${sourceX}px,${sourceY}px)`,
                background: 'transparent',
                fontSize: 12,
                color: strokeColor,
                fontWeight: 600,
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {CARD_SYMBOLS[cardStart]}
            </div>
          )}
          {cardEnd !== 'none' && (
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%,-50%) translate(${targetX}px,${targetY}px)`,
                background: 'transparent',
                fontSize: 12,
                color: strokeColor,
                fontWeight: 600,
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {CARD_SYMBOLS[cardEnd]}
            </div>
          )}
        </EdgeLabelRenderer>
      )}
    </>
  )
}

/* ─── Shared Node Helpers ─────────────────────────────── */
const UniversalHandle = ({ position, id, isConnectable }) => (
  <Handle
    type="source"
    position={position}
    id={id || position}
    isConnectable={isConnectable}
    className={`!w-2.5 !h-2.5 !border-2 !border-background !transition-all ${isConnectable === false
        ? '!opacity-0 !pointer-events-none'
        : '!opacity-0 group-hover:!opacity-100 !bg-primary/50 hover:!bg-primary hover:!w-3.5 hover:!h-3.5'
      }`}
  />
)

const CustomResizer = ({ selected, minWidth, minHeight, touchFriendly = false }) => (
  <NodeResizer
    minWidth={minWidth}
    minHeight={minHeight}
    isVisible={selected}
    color="#3b82f6"
    handleClassName={touchFriendly ? 'diagram-resize-handle diagram-resize-handle--lg' : 'diagram-resize-handle'}
    lineClassName="diagram-resize-line"
    handleStyle={{
      width: touchFriendly ? 12 : 10,
      height: touchFriendly ? 12 : 10,
      borderRadius: 4,
      border: '1px solid #3b82f6',
      backgroundColor: '#fff',
    }}
    lineStyle={{ border: '1px dashed #3b82f6' }}
  />
)

const autosizeTextarea = (el) => {
  if (!el) return
  el.style.height = '0px'
  el.style.height = `${el.scrollHeight}px`
}

const estimateMultilineHeight = (text, minHeight = 28) => {
  const lines = String(text || '').split('\n').length
  const lineHeight = 20
  const padding = 10
  return Math.max(minHeight, lines * lineHeight + padding)
}

const EditableLabel = ({
  id,
  value,
  field = 'label',
  multiline = false,
  autoGrowNode = false,
  placeholder = 'Double-click',
  underline,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef(null)
  const { setNodes } = useReactFlow()

  useEffect(() => {
    if (!isEditing) return
    autosizeTextarea(textareaRef.current)
  }, [isEditing, value])

  const updateValue = (val, textareaEl) => {
    if (textareaEl) autosizeTextarea(textareaEl)
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n
        const next = { ...n, data: { ...n.data, [field]: val } }
        if (autoGrowNode && multiline) {
          const nextHeight = estimateMultilineHeight(val, 28)
          const currentHeight = Number(n.style?.height) || 0
          next.style = { ...n.style, height: Math.max(currentHeight, nextHeight) }
        }
        return next
      }),
    )
  }

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={value || ''}
        onChange={(e) => updateValue(e.target.value, e.target)}
        onBlur={() => setIsEditing(false)}
        autoFocus
        rows={1}
        className="diagram-editable-label__textarea w-full bg-transparent border-none outline-none text-sm text-foreground p-0 m-0 resize-none block"
        style={{ textAlign: multiline ? 'left' : 'center' }}
        onKeyDown={(e) => {
          if (!multiline && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            setIsEditing(false)
          }
        }}
      />
    )
  }
  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
      }}
      className={`w-full min-h-[1.25rem] flex flex-col cursor-text select-none break-words ${underline ? 'underline underline-offset-2' : ''}`}
      style={{
        alignItems: multiline ? 'flex-start' : 'center',
        justifyContent: multiline ? 'flex-start' : 'center',
        whiteSpace: 'pre-wrap',
        textAlign: multiline ? 'left' : 'center',
      }}
      title="Double-click to edit"
    >
      {value || <span className="opacity-40 text-xs">{placeholder}</span>}
    </div>
  )
}

/* ─── Flowchart Nodes ─────────────────────────────────── */
const wrapNode = (content, minW = 80, minH = 40, resizerOpts = {}) => ({ id, data, selected, isConnectable }) => (
  <div className={`group relative w-full h-full text-sm font-medium ${selected ? 'ring-2 ring-primary rounded-sm' : ''}`}>
    <CustomResizer minWidth={minW} minHeight={minH} selected={selected} {...resizerOpts} />
    <div className="relative flex items-center justify-center w-full h-full">
      {content(id, data)}
      <UniversalHandle position={Position.Top} isConnectable={isConnectable} />
      <UniversalHandle position={Position.Bottom} isConnectable={isConnectable} />
      <UniversalHandle position={Position.Right} id="right" isConnectable={isConnectable} />
      <UniversalHandle position={Position.Left} id="left" isConnectable={isConnectable} />
    </div>
  </div>
)

const ProcessNode = wrapNode((id, data) => (
  <>
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 text-background fill-current stroke-foreground/80 drop-shadow-sm overflow-visible" style={{ strokeWidth: 1.5 }}>
      <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="4" />
    </svg>
    <div className="relative z-10 text-center w-full h-full p-2 flex items-center justify-center">
      <EditableLabel id={id} value={data.label} />
    </div>
  </>
))

const PillNode = wrapNode((id, data) => (
  <>
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 text-background fill-current stroke-foreground/80 drop-shadow-sm overflow-visible" style={{ strokeWidth: 1.5 }}>
      <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="50" />
    </svg>
    <div className="relative z-10 text-center w-full h-full p-2 flex items-center justify-center">
      <EditableLabel id={id} value={data.label} />
    </div>
  </>
))

const DiamondNode = wrapNode((id, data) => (
  <>
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 text-background fill-current stroke-foreground/80 drop-shadow-sm overflow-visible" style={{ strokeWidth: 1.5 }}>
      <polygon points="50,1 99,50 50,99 1,50" />
    </svg>
    <div className="relative z-10 text-center w-[65%] h-[65%] flex items-center justify-center">
      <EditableLabel id={id} value={data.label} />
    </div>
  </>
), 60, 60)

const CircleNode = wrapNode((id, data) => (
  <>
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 text-background fill-current stroke-foreground/80 drop-shadow-sm overflow-visible" style={{ strokeWidth: 1.5 }}>
      <circle cx="50" cy="50" r="49" />
    </svg>
    <div className="relative z-10 text-center w-[80%] h-[80%] flex items-center justify-center">
      <EditableLabel id={id} value={data.label} />
    </div>
  </>
), 50, 50)

const ParallelogramNode = wrapNode((id, data) => (
  <>
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 text-background fill-current stroke-foreground/80 drop-shadow-sm overflow-visible" style={{ strokeWidth: 1.5 }}>
      <polygon points="15,1 99,1 85,99 1,99" />
    </svg>
    <div className="relative z-10 text-center w-[75%] h-[75%] flex items-center justify-center">
      <EditableLabel id={id} value={data.label} />
    </div>
  </>
))

const HexagonNode = wrapNode((id, data) => (
  <>
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 text-background fill-current stroke-foreground/80 drop-shadow-sm overflow-visible" style={{ strokeWidth: 1.5 }}>
      <polygon points="15,1 85,1 99,50 85,99 15,99 1,50" />
    </svg>
    <div className="relative z-10 text-center w-[65%] h-[65%] flex items-center justify-center">
      <EditableLabel id={id} value={data.label} />
    </div>
  </>
))

const TextNode = wrapNode(
  (id, data) => (
    <div className="diagram-text-node relative z-10 w-full h-full p-1.5 flex">
      <EditableLabel id={id} value={data.label} multiline autoGrowNode placeholder="Text" />
    </div>
  ),
  60,
  28,
  { touchFriendly: true },
)

/* ─── ERD Entity Node ─────────────────────────────────── */
const ErdEntityNode = ({ id, data, selected, isConnectable }) => {
  const attributes = Array.isArray(data.attributes) ? data.attributes : []
  return (
    <div className={`group relative flex flex-col w-full h-full bg-background drop-shadow-sm border-2 text-sm overflow-hidden ${selected ? 'border-primary shadow-lg' : 'border-foreground/80'}`}>
      <CustomResizer minWidth={150} minHeight={100} selected={selected} />
      <div className="relative flex flex-col w-full h-full">
        <div className="bg-muted/80 border-b-2 border-foreground/80 px-2 py-1 font-bold text-center shrink-0">
          <EditableLabel id={id} value={data.label} placeholder="Entity Name" />
        </div>
        <div className="flex-1 overflow-hidden">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {attributes.map((attr, idx) => (
                <tr key={idx} className="border-b border-border/40 last:border-0">
                  <td className="w-8 shrink-0 border-r border-border/40 text-[10px] font-bold text-primary text-center py-0.5 px-1 bg-muted/20 leading-tight">
                    {attr.isPk ? 'PK' : attr.isFk ? 'FK' : ''}
                  </td>
                  <td className={`px-2 py-0.5 leading-tight ${attr.isPk ? 'font-semibold underline underline-offset-2' : ''}`}>
                    {attr.name}
                  </td>
                  {attr.type && (
                    <td className="px-1 py-0.5 leading-tight text-muted-foreground italic text-[10px]">{attr.type}</td>
                  )}
                </tr>
              ))}
              {attributes.length === 0 && (
                <tr><td colSpan="3" className="p-2 text-center text-muted-foreground opacity-40 italic text-[9px]">Select to add attributes</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <UniversalHandle position={Position.Top} isConnectable={isConnectable} />
        <UniversalHandle position={Position.Bottom} isConnectable={isConnectable} />
        <UniversalHandle position={Position.Right} id="right" isConnectable={isConnectable} />
        <UniversalHandle position={Position.Left} id="left" isConnectable={isConnectable} />
      </div>
    </div>
  )
}

/* ─── Type Maps ───────────────────────────────────────── */
const nodeTypes = {
  default: ProcessNode, process: ProcessNode,
  pill: PillNode, diamond: DiamondNode, circle: CircleNode,
  parallelogram: ParallelogramNode, hexagon: HexagonNode,
  textNode: TextNode,
  erdEntity: ErdEntityNode,
}
const edgeTypes = { cardinality: CardinalityEdge }

/* ─── Shape Config ────────────────────────────────────── */
function parseDiagramValue(value) {
  try {
    const data = JSON.parse(value || '{}')
    return {
      nodes: Array.isArray(data?.nodes) ? data.nodes : [],
      edges: Array.isArray(data?.edges) ? data.edges : [],
    }
  } catch { return { nodes: [], edges: [] } }
}

const FLOWCHART_SHAPES = [
  { type: 'process', label: 'Process', preview: 'rect' },
  { type: 'pill', label: 'Start/End', preview: 'pill' },
  { type: 'diamond', label: 'Decision', preview: 'diamond' },
  { type: 'hexagon', label: 'Preparation', preview: 'hexagon' },
  { type: 'parallelogram', label: 'I/O', preview: 'parallelogram' },
  { type: 'circle', label: 'Connector', preview: 'circle' },
  { type: 'textNode', label: 'Text', preview: 'textNode' },
]
const ERD_SHAPES = [{ type: 'erdEntity', label: 'Entity', preview: 'erdEntity' }]

function ShapePreview({ preview, label }) {
  const getSvg = () => {
    switch (preview) {
      case 'rect': return <rect x="5" y="15" width="90" height="70" rx="4" />
      case 'pill': return <rect x="5" y="15" width="90" height="70" rx="35" />
      case 'diamond': return <polygon points="50,5 95,50 50,95 5,50" />
      case 'circle': return <circle cx="50" cy="50" r="45" />
      case 'parallelogram': return <polygon points="20,15 95,15 80,85 5,85" />
      case 'hexagon': return <polygon points="20,15 80,15 95,50 80,85 20,85 5,50" />
      case 'textNode': return <text x="50" y="70" fontSize="70" fontFamily="sans-serif" textAnchor="middle" className="fill-foreground" stroke="none" style={{ strokeWidth: 0, fontWeight: 'bold' }}>T</text>
      case 'erdEntity': return (
        <>
          <rect x="5" y="5" width="90" height="90" rx="2" strokeWidth="6" />
          <line x1="5" y1="28" x2="95" y2="28" />
          <line x1="28" y1="28" x2="28" y2="95" />
          <line x1="35" y1="45" x2="80" y2="45" strokeWidth="4" />
          <line x1="35" y1="60" x2="70" y2="60" strokeWidth="4" />
        </>
      )
      default: return <rect x="5" y="15" width="90" height="70" />
    }
  }
  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <svg width="30" height="24" viewBox="0 0 100 100" className="text-background fill-current stroke-foreground drop-shadow-sm" style={{ strokeWidth: 6 }}>
        {getSvg()}
      </svg>
      <span className="text-[9px] leading-tight text-center">{label}</span>
    </div>
  )
}

/* ─── Main Canvas ─────────────────────────────────────── */
function DiagramEditorCanvas({ variant = 'flowchart', value = '', onChange, readOnly = false, height = 400 }) {
  const { theme } = useTheme()
  const [defCardStart, setDefCardStart] = useState('one')
  const [defCardEnd, setDefCardEnd] = useState('many')
  const parsed = useMemo(() => {
    const raw = parseDiagramValue(value)
    if (readOnly) {
      raw.nodes = raw.nodes.map(n => ({ ...n, selected: false }))
      raw.edges = raw.edges.map(e => ({ ...e, selected: false }))
    }
    return raw
  }, [value, readOnly])
  const [nodes, setNodes, onNodesChange] = useNodesState(parsed.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsed.edges)
  const reactFlowWrapper = useRef(null)
  const { screenToFlowPosition } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()

  // Keep internal state in sync when value prop changes from outside
  useEffect(() => {
    setNodes(parsed.nodes)
    setEdges(parsed.edges)
  }, [parsed.edges, parsed.nodes, setEdges, setNodes])

  // Use a ref to call onChange without stale closures
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const emitChange = useCallback((nextNodes, nextEdges) => {
    onChangeRef.current?.(JSON.stringify({ nodes: nextNodes, edges: nextEdges }))
  }, [])

  // Emit when node data changes (label edits) — deferred to avoid setState-during-render
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])

  // Keep resize handles aligned when the flex canvas changes size.
  useEffect(() => {
    const el = reactFlowWrapper.current
    if (!el) return undefined
    const syncNodeInternals = () => {
      nodesRef.current.forEach((node) => updateNodeInternals(node.id))
    }
    syncNodeInternals()
    const ro = new ResizeObserver(syncNodeInternals)
    ro.observe(el)
    return () => ro.disconnect()
  }, [updateNodeInternals])

  const dataStr = useMemo(() => JSON.stringify(nodes.map(n => ({ id: n.id, data: n.data, style: n.style }))), [nodes])
  const prevDataStr = useRef(dataStr)
  useEffect(() => {
    if (dataStr === prevDataStr.current) return
    prevDataStr.current = dataStr
    // Defer so it doesn't fire during render cycle
    const t = setTimeout(() => emitChange(nodesRef.current, edgesRef.current), 0)
    return () => clearTimeout(t)
  }, [dataStr, emitChange])

  const onConnect = useCallback((connection) => {
    if (readOnly) return
    setEdges((eds) => {
      const next = addEdge({
        ...connection,
        type: variant === 'erd' ? 'cardinality' : 'smoothstep',
        ...(variant === 'erd'
          ? { data: { cardStart: defCardStart, cardEnd: defCardEnd } }
          : { markerEnd: { type: MarkerType.ArrowClosed, width: 25, height: 25 } }),
      }, eds)
      emitChange(nodesRef.current, next)
      return next
    })
  }, [emitChange, readOnly, setEdges, variant, defCardStart, defCardEnd])

  const onNodeDragStop = useCallback(() => {
    if (!readOnly) emitChange(nodesRef.current, edgesRef.current)
  }, [emitChange, readOnly])

  const onReconnect = useCallback((oldEdge, newConnection) => {
    if (readOnly) return
    setEdges((eds) => {
      const next = reconnectEdge(oldEdge, newConnection, eds)
      emitChange(nodesRef.current, next)
      return next
    })
  }, [emitChange, readOnly, setEdges])

  const clearDiagram = useCallback(() => {
    if (readOnly) return
    setNodes([]); setEdges([]); emitChange([], [])
  }, [emitChange, readOnly, setEdges, setNodes])

  const onDragStart = (e, nodeType, shapeLabel) => {
    e.dataTransfer.setData('application/reactflow-type', nodeType)
    e.dataTransfer.setData('application/reactflow-label', shapeLabel)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    if (readOnly) return
    const type = e.dataTransfer.getData('application/reactflow-type')
    const label = e.dataTransfer.getData('application/reactflow-label')
    if (!type) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    let style = { width: 120, height: 50 }
    let extraData = {}
    if (['diamond', 'circle'].includes(type)) style = { width: 80, height: 80 }
    if (type === 'textNode') style = { width: 140, height: 48 }
    if (type === 'erdEntity') {
      style = { width: 180, height: 140 }
      extraData.attributes = [
        { name: 'id', isPk: true, isFk: false, type: 'INT' },
        { name: 'name', isPk: false, isFk: false, type: 'VARCHAR' },
      ]
    }
    const newNode = { id: `node-${Date.now()}`, position, data: { label, ...extraData }, type, style }
    setNodes((nds) => { const next = nds.concat(newNode); emitChange(next, edgesRef.current); return next })
  }, [screenToFlowPosition, emitChange, setNodes, readOnly])

  const deleteSelected = useCallback(() => {
    if (readOnly) return
    const selNodeIds = new Set(nodes.filter(n => n.selected).map(n => n.id))
    const selEdgeIds = new Set(edges.filter(e => e.selected).map(e => e.id))
    setNodes(nds => {
      const next = nds.filter(n => !selNodeIds.has(n.id))
      setEdges(eds => {
        const nextE = eds.filter(e => !selNodeIds.has(e.source) && !selNodeIds.has(e.target) && !selEdgeIds.has(e.id))
        emitChange(next, nextE)
        return nextE
      })
      return next
    })
  }, [readOnly, nodes, edges, setNodes, setEdges, emitChange])

  const addEntityAttribute = (nodeId) => setNodes(nds => nds.map(n => n.id !== nodeId ? n : { ...n, data: { ...n.data, attributes: [...(n.data.attributes || []), { name: 'attr', isPk: false, isFk: false, type: '' }] } }))
  const updateEntityAttribute = (nodeId, idx, field, val) => setNodes(nds => nds.map(n => { if (n.id !== nodeId) return n; const a = [...(n.data.attributes || [])]; a[idx] = { ...a[idx], [field]: val }; return { ...n, data: { ...n.data, attributes: a } } }))
  const removeEntityAttribute = (nodeId, idx) => setNodes(nds => nds.map(n => { if (n.id !== nodeId) return n; const a = [...(n.data.attributes || [])]; a.splice(idx, 1); return { ...n, data: { ...n.data, attributes: a } } }))

  const updateEdgeCardinality = (edgeId, end, cardValue) => {
    setEdges(eds => {
      const next = eds.map(e => e.id !== edgeId ? e : {
        ...e, data: { ...e.data, [end === 'start' ? 'cardStart' : 'cardEnd']: cardValue }
      })
      emitChange(nodesRef.current, next)
      return next
    })
  }

  const selectedNode = nodes.filter(n => n.selected).length === 1 ? nodes.find(n => n.selected) : null
  const selectedEdge = edges.filter(e => e.selected).length === 1 ? edges.find(e => e.selected) : null
  const shapes = variant === 'erd' ? ERD_SHAPES : FLOWCHART_SHAPES

  return (
    <div
      className={`relative w-full diagram-editor-wrapper${readOnly ? '' : ' diagram-editor-wrapper--with-toolbar'}`}
      style={{ height }}
    >

      {/* ── Toolbar ── */}
      {!readOnly && (
        <div className="diagram-editor-toolbar shrink-0 border border-border bg-background shadow-sm rounded-md flex flex-col overflow-y-auto select-none text-sm">

          {/* Shape Palette */}
          <div className="p-2 border-b border-border/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {variant === 'erd' ? 'ERD' : 'Flowchart'}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {shapes.map((s) => (
                <div
                  key={s.type}
                  className="flex flex-col items-center justify-center p-1.5 rounded border border-transparent hover:border-border hover:bg-muted cursor-grab active:cursor-grabbing transition-colors"
                  draggable
                  onDragStart={(e) => onDragStart(e, s.type, s.label)}
                  title={`Drag: ${s.label}`}
                >
                  <ShapePreview preview={s.preview} label={s.label} />
                </div>
              ))}
            </div>
          </div>

          {/* Node Properties */}
          {selectedNode && (
            <div className="p-2 border-b border-border/50 flex flex-col gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Node</div>
              <label className="text-[9px] text-muted-foreground">Label</label>
              <Input
                value={selectedNode.data?.label || ''}
                onChange={(e) => setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: e.target.value } } : n))}
                placeholder="Label..."
                className="h-7 text-xs px-2"
              />
              {selectedNode.type === 'erdEntity' && (
                <div className="mt-1">
                  <div className="text-[9px] text-muted-foreground flex justify-between items-center mb-1">
                    <span className="font-semibold uppercase">Attributes</span>
                    <button onClick={() => addEntityAttribute(selectedNode.id)} className="text-primary text-[9px] hover:underline">+ add</button>
                  </div>
                  <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
                    {(selectedNode.data.attributes || []).map((attr, idx) => (
                      <div key={idx} className="flex items-center gap-0.5 bg-muted/30 rounded border border-border/40 p-0.5">
                        <select
                          className="w-9 h-6 text-[9px] bg-background border border-input rounded"
                          value={attr.isPk ? 'PK' : attr.isFk ? 'FK' : '-'}
                          onChange={(e) => {
                            updateEntityAttribute(selectedNode.id, idx, 'isPk', e.target.value === 'PK')
                            updateEntityAttribute(selectedNode.id, idx, 'isFk', e.target.value === 'FK')
                          }}
                        >
                          <option>-</option><option>PK</option><option>FK</option>
                        </select>
                        <Input value={attr.name} onChange={(e) => updateEntityAttribute(selectedNode.id, idx, 'name', e.target.value)} className="flex-1 h-6 text-[10px] px-1 min-w-0" placeholder="name" />
                        <Input value={attr.type || ''} onChange={(e) => updateEntityAttribute(selectedNode.id, idx, 'type', e.target.value)} className="w-10 h-6 text-[9px] px-0.5" placeholder="type" />
                        <button onClick={() => removeEntityAttribute(selectedNode.id, idx)} className="text-destructive p-0.5 shrink-0"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button type="button" onClick={deleteSelected} className="mt-1 w-full flex items-center justify-center gap-1 text-xs text-destructive hover:bg-destructive/10 rounded py-1">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}

          {/* Edge label (Flowchart) */}
          {selectedEdge && variant !== 'erd' && (
            <div className="p-2 border-b border-border/50 flex flex-col gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Edge</div>
              <label className="text-[9px] text-muted-foreground">Label</label>
              <Input
                id="edge-label-input"
                value={selectedEdge.label || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setEdges(eds => {
                    const next = eds.map(edge => edge.id === selectedEdge.id ? { ...edge, label: val } : edge);
                    emitChange(nodesRef.current, next);
                    return next;
                  });
                }}
                placeholder="Edge label..."
                className="h-7 text-xs px-2"
              />
              <button type="button" onClick={deleteSelected} className="mt-1 w-full flex items-center justify-center gap-1 text-xs text-destructive hover:bg-destructive/10 rounded py-1">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}

          {/* Edge cardinality (ERD) */}
          {selectedEdge && variant === 'erd' && (
            <div className="p-2 border-b border-border/50 flex flex-col gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Relationship</div>
              <label className="text-[9px] text-muted-foreground">Source end</label>
              <select className="h-7 text-xs border border-input rounded bg-background px-1"
                value={selectedEdge.data?.cardStart || 'none'}
                onChange={(e) => updateEdgeCardinality(selectedEdge.id, 'start', e.target.value)}>
                {CARDINALITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <label className="text-[9px] text-muted-foreground">Target end</label>
              <select className="h-7 text-xs border border-input rounded bg-background px-1"
                value={selectedEdge.data?.cardEnd || 'none'}
                onChange={(e) => updateEdgeCardinality(selectedEdge.id, 'end', e.target.value)}>
                {CARDINALITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button type="button" onClick={deleteSelected} className="mt-1 w-full flex items-center justify-center gap-1 text-xs text-destructive hover:bg-destructive/10 rounded py-1">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}

          {/* Default cardinality for new ERD lines */}
          {variant === 'erd' && !selectedNode && !selectedEdge && (
            <div className="p-2 border-b border-border/50 flex flex-col gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">New Line Defaults</div>
              <label className="text-[9px] text-muted-foreground">Source end</label>
              <select className="h-7 text-xs border border-input rounded bg-background px-1" value={defCardStart} onChange={(e) => setDefCardStart(e.target.value)}>
                {CARDINALITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <label className="text-[9px] text-muted-foreground">Target end</label>
              <select className="h-7 text-xs border border-input rounded bg-background px-1" value={defCardEnd} onChange={(e) => setDefCardEnd(e.target.value)}>
                {CARDINALITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}

          <div className="mt-auto p-2 border-t border-border/50">
            <button type="button" onClick={clearDiagram} className="w-full text-[10px] text-muted-foreground hover:text-foreground py-1 rounded hover:bg-muted">
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* ── Canvas ── */}
      <div className="diagram-editor-canvas w-full h-full min-w-0 rounded-md border border-border overflow-hidden bg-background bg-dot-pattern bg-[length:20px_20px]" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onEdgeDoubleClick={(e, edge) => {
            setTimeout(() => document.getElementById('edge-label-input')?.focus(), 50)
          }}
          onNodeDragStop={onNodeDragStop}
          onDragOver={onDragOver}
          onDrop={onDrop}
          colorMode={theme === 'dark' ? 'dark' : 'light'}
          connectionMode={ConnectionMode.Loose}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          fitView
          fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          edgesReconnectable={!readOnly}
          deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={variant === 'erd'
            ? { type: 'cardinality', interactionWidth: 20, data: { cardStart: defCardStart, cardEnd: defCardEnd } }
            : { type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 25, height: 25 }, interactionWidth: 20 }
          }
        >
          <Background gap={16} size={1} />
          <Controls showInteractive={!readOnly} position="bottom-right" />
          <Panel position="top-right" className="text-xs text-muted-foreground bg-background/90 px-2 py-1 rounded border shadow-sm">
            {labelForDiagramVariant(variant)}
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
}

export default function DiagramEditor(props) {
  return (
    <ReactFlowProvider>
      <DiagramEditorCanvas {...props} />
    </ReactFlowProvider>
  )
}

export { DIAGRAM_VARIANTS } from '@/lib/diagramQuestion.js'
