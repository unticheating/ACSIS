import { Skeleton } from '@/components/ui/skeleton.jsx'

/** Full-page loading placeholder while session/auth resolves. */
export default function AuthLoadingSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--acsis-canvas)] p-6 md:p-8"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
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
