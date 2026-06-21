import { useLayoutEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton.jsx'



const COLLAPSED_CLASS = 'acsis-sidebar-collapsed'
const COLLAPSED_STORAGE_KEY = 'acsis.sidebarCollapsed'

/** Full-page loading placeholder while session/auth resolves. */
export default function AuthLoadingSkeleton() {
  /* Apply the persisted sidebar-collapsed class to <html> immediately so the
     skeleton sidebar width matches what AppSidebar will render later. */
  useLayoutEffect(() => {
    let isCollapsed = false
    try {
      isCollapsed = window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1'
    } catch { /* ignore */ }
    if (!isCollapsed) {
      isCollapsed = document.documentElement.getAttribute('data-acsis-sidebar') === 'collapsed'
    }
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    if (isCollapsed && !isMobile) {
      document.documentElement.classList.add(COLLAPSED_CLASS)
    }
  }, [])
  return (
    <div className="acsis-app" role="status" aria-live="polite" aria-label="Loading">
      {/* ─── Desktop sidebar ─── */}
      <div className="sidebar acsis-sidebar-desktop" id="main-sidebar">
        <div className="acsis-sidebar-header">
          <div className="acsis-logo-mark">
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item">
            <Skeleton className="admin-nav-icon h-4 w-4 rounded-sm" />
            <span className="acsis-nav-label flex-1"><Skeleton className="h-4 w-24 rounded-md ml-3" /></span>
          </div>
          <div className="nav-item">
            <Skeleton className="admin-nav-icon h-4 w-4 rounded-sm" />
            <span className="acsis-nav-label flex-1"><Skeleton className="h-4 w-32 rounded-md ml-3" /></span>
          </div>
          <div className="nav-item">
            <Skeleton className="admin-nav-icon h-4 w-4 rounded-sm" />
            <span className="acsis-nav-label flex-1"><Skeleton className="h-4 w-20 rounded-md ml-3" /></span>
          </div>
        </nav>
        <div className="acsis-sidebar-bottom p-4">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>

      {/* ─── Mobile top bar (hidden on desktop via CSS) ─── */}
      <header className="acsis-mobile-top-bar">
        <div className="acsis-mobile-top-bar__brand">
          <div className="acsis-mobile-top-bar__logo">
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <div className="acsis-mobile-top-bar__breadcrumb breadcrumb">
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
        </div>
        <div className="acsis-mobile-top-bar__actions">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>

      {/* ─── Main content area ─── */}
      <main className="acsis-main" id="acsis-main-content">
        <div className="acsis-page">
          <header className="content-header w-full">
            <div className="breadcrumb">
              <Skeleton className="h-5 w-48 rounded-md" />
            </div>
          </header>
          <div className="content-body">
            <div className="acsis-view w-full">
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
        </div>
      </main>

      {/* ─── Mobile bottom nav (hidden on desktop via CSS) ─── */}
      <nav className="acsis-mobile-bottom-nav">
        <div className="acsis-bottom-nav__item">
          <Skeleton className="h-6 w-6 rounded-sm" />
          <Skeleton className="h-3 w-12 rounded-sm" />
        </div>
        <div className="acsis-bottom-nav__item">
          <Skeleton className="h-6 w-6 rounded-sm" />
          <Skeleton className="h-3 w-16 rounded-sm" />
        </div>
        <div className="acsis-bottom-nav__item">
          <Skeleton className="h-6 w-6 rounded-sm" />
          <Skeleton className="h-3 w-10 rounded-sm" />
        </div>
      </nav>
    </div>
  )
}
