export const DIAGRAM_VARIANTS = [
  { value: 'flowchart', label: 'Flowchart' },
  { value: 'erd', label: 'ERD (Entity Relationship)' },
]

export const DEFAULT_DIAGRAM_VARIANT = 'flowchart'

/**
 * @param {string | null | undefined} variant
 */
export function labelForDiagramVariant(variant) {
  const key = String(variant || DEFAULT_DIAGRAM_VARIANT).toLowerCase()
  return DIAGRAM_VARIANTS.find((v) => v.value === key)?.label || 'Diagram'
}

/**
 * @param {string | null | undefined} raw
 */
export function parseDiagramData(raw) {
  if (!raw) return { nodes: [], edges: [] }
  try {
    const parsed = JSON.parse(raw)
    return {
      nodes: Array.isArray(parsed?.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed?.edges) ? parsed.edges : [],
    }
  } catch {
    return { nodes: [], edges: [] }
  }
}

/**
 * @param {{ nodes?: unknown[], edges?: unknown[] } | null | undefined} data
 */
export function stringifyDiagramData(data) {
  return JSON.stringify({
    nodes: Array.isArray(data?.nodes) ? data.nodes : [],
    edges: Array.isArray(data?.edges) ? data.edges : [],
  })
}

export function emptyDiagramData() {
  return stringifyDiagramData({ nodes: [], edges: [] })
}

/**
 * @param {{ options?: string[] | null, diagramVariant?: string | null }} q
 */
export function diagramVariantFromQuestion(q) {
  const fromField = q?.diagramVariant || q?.options?.[0]
  const key = String(fromField || DEFAULT_DIAGRAM_VARIANT).toLowerCase()
  return DIAGRAM_VARIANTS.some((v) => v.value === key) ? key : DEFAULT_DIAGRAM_VARIANT
}

/**
 * @param {{ correctAnswer?: string | object | null, diagramReference?: string | object | null }} q
 * @returns {string}
 */
export function diagramReferenceFromQuestion(q) {
  const raw = q?.diagramReference || q?.correctAnswer || ''
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object') return stringifyDiagramData(raw)
  return ''
}
