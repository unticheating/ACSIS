import { Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import { FILL_MODES } from '@/lib/detectionsSeatLayout.js'

/**
 * @param {{
 *   seatSettings: { sortBy: string, fillMode: string },
 *   onFillModeChange: (mode: string) => void,
 *   triggerClassName?: string,
 * }} props
 */
export default function DetectionsSeatSettingsMenu({
  seatSettings,
  onFillModeChange,
  triggerClassName = 'acsis-detections-settings-btn',
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={triggerClassName} aria-label="Seat layout settings">
          <Settings size={20} strokeWidth={2} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>Sort students</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={seatSettings.sortBy}>
          <DropdownMenuRadioItem value="surname" onSelect={(e) => e.preventDefault()}>
            Alphabetical (surname)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Seat order</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={seatSettings.fillMode} onValueChange={onFillModeChange}>
          <DropdownMenuRadioItem
            value={FILL_MODES.LEFT}
            onSelect={(e) => e.preventDefault()}
          >
            Left to right
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={FILL_MODES.RIGHT}
            onSelect={(e) => e.preventDefault()}
          >
            Right to left
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={FILL_MODES.SNAKE_LEFT}
            onSelect={(e) => e.preventDefault()}
          >
            Zigzag from left
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={FILL_MODES.SNAKE_RIGHT}
            onSelect={(e) => e.preventDefault()}
          >
            Zigzag from right
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={FILL_MODES.RANDOM}
            onSelect={(e) => e.preventDefault()}
          >
            Random
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
