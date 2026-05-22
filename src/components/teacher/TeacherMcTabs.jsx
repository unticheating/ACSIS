/**
 * @param {{ 'aria-label': string, value: string, onChange: (id: string) => void, tabs: { id: string, label: string }[] }} props
 */
export default function TeacherMcTabs({ 'aria-label': ariaLabel, value, onChange, tabs }) {
  return (
    <div className="acsis-mc-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`acsis-mc-tab${active ? ' acsis-mc-tab--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
