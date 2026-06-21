import { Skeleton } from '@/components/ui/skeleton.jsx'

/** Full-page loading placeholder while session/auth resolves. */
export default function AuthLoadingSkeleton() {
  return (
    <div className="acsis-app" role="status" aria-live="polite" aria-label="Loading">
      <div className="sidebar acsis-sidebar-desktop" id="main-sidebar">
        <div className="acsis-sidebar-header">
          <div className="acsis-logo-mark">
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-24 rounded-md ml-3" />
          </div>
          <div className="nav-item">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-32 rounded-md ml-3" />
          </div>
          <div className="nav-item">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-4 w-20 rounded-md ml-3" />
          </div>
        </nav>
        <div className="acsis-sidebar-bottom p-4">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>

      <header className="acsis-mobile-top-bar">
        <div className="acsis-mobile-top-bar__brand">
          <Skeleton className="h-6 w-32 rounded-md" />
        </div>
        <div className="acsis-mobile-top-bar__actions">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>

      <main className="acsis-main" id="acsis-main-content">
        <div className="acsis-page">
          <div className="content-body p-6 md:p-8">
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
        </div>
      </main>
    </div>
  )
}
