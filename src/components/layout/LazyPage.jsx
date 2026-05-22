import { Suspense } from 'react'
import RouteFallback from './RouteFallback.jsx'

/** Suspense boundary for lazy route/layout components (no fade). */
export default function LazyPage({ children }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>
}
