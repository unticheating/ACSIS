import { Suspense } from 'react'
import AuthLoadingSkeleton from './AuthLoadingSkeleton.jsx'

/** Suspense boundary for lazy route/layout components (no fade). */
export default function LazyPage({ children }) {
  return <Suspense fallback={<AuthLoadingSkeleton />}>{children}</Suspense>
}
