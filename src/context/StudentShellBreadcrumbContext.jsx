import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { coerceDisplayString } from '@/lib/coerceDisplay.js'

/** @type {import('react').Context<{ segments: { label: string, to?: string }[], setSegments: (s: { label: string, to?: string }[] | null) => void } | null>} */
const StudentShellBreadcrumbContext = createContext(null)

export function StudentShellBreadcrumbProvider({ children }) {
  const [segments, setSegments] = useState(/** @type {{ label: string, to?: string }[] | null} */ (null))
  const value = useMemo(() => ({ segments, setSegments }), [segments])
  return (
    <StudentShellBreadcrumbContext.Provider value={value}>{children}</StudentShellBreadcrumbContext.Provider>
  )
}

export function useStudentShellBreadcrumbSegments() {
  const ctx = useContext(StudentShellBreadcrumbContext)
  return ctx?.segments ?? null
}

/**
 * @param {{ label: string, to?: string }[] | null} trail
 */
export function useStudentShellBreadcrumbTrail(trail) {
  const ctx = useContext(StudentShellBreadcrumbContext)
  const trailKey =
    trail?.map((s) => `${coerceDisplayString(s.label)}\0${coerceDisplayString(s.to)}`).join('\n') ?? ''
  useEffect(() => {
    if (!ctx) return undefined
    ctx.setSegments(trail)
    return () => {
      ctx.setSegments(null)
    }
  }, [ctx, trail, trailKey])
}
