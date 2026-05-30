import { LayoutGrid, List } from 'lucide-react'
import { VIEW_MODES } from '@/lib/detectionsSeatLayout.js'

/**
 * @param {{ viewMode: string, onViewModeChange: (mode: string) => void, className?: string }} props
 */
export default function DetectionsViewModeToggle({ viewMode, onViewModeChange, className = '' }) {
  return (
    <div
      className={`acsis-detections-view-toggle${className ? ` ${className}` : ''}`}
      role="group"
      aria-label="Monitoring view mode"
    >
      <button
        type="button"
        className={`acsis-detections-view-toggle__btn${viewMode === VIEW_MODES.LIST ? ' is-active' : ''}`}
        onClick={() => onViewModeChange(VIEW_MODES.LIST)}
        aria-pressed={viewMode === VIEW_MODES.LIST}
      >
        <List className="acsis-detections-view-toggle__icon" aria-hidden />
        <span className="acsis-detections-view-toggle__label">List</span>
      </button>
      <button
        type="button"
        className={`acsis-detections-view-toggle__btn${viewMode === VIEW_MODES.CLASSROOM ? ' is-active' : ''}`}
        onClick={() => onViewModeChange(VIEW_MODES.CLASSROOM)}
        aria-pressed={viewMode === VIEW_MODES.CLASSROOM}
      >
        <LayoutGrid className="acsis-detections-view-toggle__icon" aria-hidden />
        <span className="acsis-detections-view-toggle__label">Classroom</span>
      </button>
    </div>
  )
}
