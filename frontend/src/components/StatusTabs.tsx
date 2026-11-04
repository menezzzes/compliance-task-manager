import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { TaskQuery } from '../utils/taskQuery'

type StatusFilter = TaskQuery['status']

const TABS: { value: StatusFilter; label: string; id: string }[] = [
  { value: '', label: 'All', id: 'status-tab-all' },
  { value: 'pending', label: 'Pending', id: 'status-tab-pending' },
  { value: 'completed', label: 'Completed', id: 'status-tab-completed' },
]

const PANEL_ID = 'status-panel'

interface StatusTabsProps {
  value: StatusFilter
  onChange: (status: StatusFilter) => void
  children: ReactNode
}

export function StatusTabs({ value, onChange, children }: StatusTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = TABS.findIndex((tab) => tab.value === value)

  function handleKeyDown(event: KeyboardEvent) {
    const lastIndex = TABS.length - 1
    const nextIndexByKey: Record<string, number> = {
      ArrowRight: selectedIndex === lastIndex ? 0 : selectedIndex + 1,
      ArrowLeft: selectedIndex === 0 ? lastIndex : selectedIndex - 1,
      Home: 0,
      End: lastIndex,
    }
    const nextIndex = nextIndexByKey[event.key]
    if (nextIndex === undefined) return

    event.preventDefault()
    onChange(TABS[nextIndex].value)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Task status" onKeyDown={handleKeyDown}>
        {TABS.map((tab, index) => {
          const selected = index === selectedIndex
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              id={tab.id}
              className="tab"
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={PANEL_ID}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.value)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div id={PANEL_ID} role="tabpanel" aria-labelledby={TABS[selectedIndex].id}>
        {children}
      </div>
    </>
  )
}
