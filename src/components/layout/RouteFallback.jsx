/** Lightweight route chunk placeholder — no fade animations. */
export default function RouteFallback() {
  return (
    <div className="acsis-route-fallback" role="status" aria-live="polite" aria-busy="true">
      <span className="acsis-route-fallback__text">Loading…</span>
    </div>
  )
}
