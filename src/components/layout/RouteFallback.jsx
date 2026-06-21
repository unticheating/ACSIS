import { Skeleton } from '@/components/ui/skeleton.jsx'

/**
 * Content-area placeholder shown inside AppShell while a lazy page chunk loads.
 * Mirrors the content section of AuthLoadingSkeleton so the transition
 * from full-page skeleton → real shell + this fallback is seamless.
 */
export default function RouteFallback() {
  return (
    <div className="acsis-view w-full" role="status" aria-live="polite" aria-busy="true">
      <Skeleton className="mb-6 h-7 w-56 max-w-full" />
      <div className="acsis-summary-stats mb-6">
        <Skeleton className="h-[108px] rounded-[14px]" />
        <Skeleton className="h-[108px] rounded-[14px]" />
        <Skeleton className="h-[108px] rounded-[14px]" />
      </div>
      <div className="grid flex-1 gap-4 lg:grid-cols-2">
        <Skeleton className="min-h-[220px] rounded-xl" />
        <Skeleton className="min-h-[220px] rounded-xl" />
      </div>
    </div>
  )
}
