import type { RefObject } from 'react'
import { CATEGORY_LABELS, PRIORITY_LABELS } from '../types'
import type { Category, Priority } from '../types'
import { SORT_OPTIONS } from '../utils/taskQuery'
import type { TaskQuery, TaskQueryChange } from '../utils/taskQuery'

interface FilterBarProps {
  query: TaskQuery
  searchText: string
  searchInputRef: RefObject<HTMLInputElement | null>
  showClear: boolean
  onSearchTextChange: (text: string) => void
  onChange: (change: TaskQueryChange) => void
  onClear: () => void
}

export function FilterBar({
  query,
  searchText,
  searchInputRef,
  showClear,
  onSearchTextChange,
  onChange,
  onClear,
}: FilterBarProps) {
  function handleSortChange(sort: string) {
    const option = SORT_OPTIONS.find((item) => item.sort === sort)
    if (option) onChange({ sort: option.sort, direction: option.direction })
  }

  return (
    <div className="filters" role="search" aria-label="Filter tasks">
      <div className="field field-search">
        <label htmlFor="filter-search">Search by title</label>
        <input
          ref={searchInputRef}
          id="filter-search"
          type="search"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="filter-category">Category</label>
        <select
          id="filter-category"
          value={query.category}
          onChange={(event) => onChange({ category: event.target.value as Category | '' })}
        >
          <option value="">All</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="filter-priority">Priority</label>
        <select
          id="filter-priority"
          value={query.priority}
          onChange={(event) => onChange({ priority: event.target.value as Priority | '' })}
        >
          <option value="">All</option>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="filter-sort">Sort by</label>
        <select id="filter-sort" value={query.sort} onChange={(event) => handleSortChange(event.target.value)}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.sort} value={option.sort}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filters-footer">
        <label className="toggle">
          <input
            type="checkbox"
            checked={query.overdue}
            onChange={(event) => onChange({ overdue: event.target.checked })}
          />
          Overdue
        </label>
        {showClear && (
          <button className="button" type="button" onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
