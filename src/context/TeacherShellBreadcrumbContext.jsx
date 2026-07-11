import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { coerceDisplayString } from '@/lib/coerceDisplay.js'

/** @type {import('react').Context<{ segments: { label: string, to?: string }[], setSegments: (s: { label: string, to?: string }[] | null) => void } | null>} */
const TeacherShellBreadcrumbContext = createContext(null)

export function TeacherShellBreadcrumbProvider({ children }) {
  const [segments, setSegments] = useState(/** @type {{ label: string, to?: string }[] | null} */ (null))
  const value = useMemo(() => ({ segments, setSegments }), [segments])
  return (
    <TeacherShellBreadcrumbContext.Provider value={value}>{children}</TeacherShellBreadcrumbContext.Provider>
  )
}

export function useTeacherShellBreadcrumbSegments() {
  const ctx = useContext(TeacherShellBreadcrumbContext)
  return ctx?.segments ?? null
}

/**
 * @param {{ label: string, to?: string }[] | null} trail
 */
export function useTeacherShellBreadcrumbTrail(trail) {
  const setSegments = useContext(TeacherShellBreadcrumbContext)?.setSegments
  const trailKey =
    trail?.map((s) => `${coerceDisplayString(s.label)}\0${coerceDisplayString(s.to)}`).join('\n') ?? ''
  useEffect(() => {
    if (!setSegments) return undefined
    setSegments(trail)
    return () => {
      setSegments(null)
    }
  }, [setSegments, trailKey, trail])
}
