import type { PaginationMeta } from '../types'

interface PaginationProps {
  meta: PaginationMeta
  currentPage: number
  onPageChange: (page: number) => void
}

export function Pagination({ meta, currentPage, onPageChange }: PaginationProps) {
  const canGoBack = currentPage > 1
  const canGoForward = currentPage < meta.total_pages

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="button"
        type="button"
        aria-disabled={!canGoBack}
        onClick={() => canGoBack && onPageChange(currentPage - 1)}
      >
        Previous
      </button>
      <span className="pagination-label">
        Page {meta.page} of {meta.total_pages}
      </span>
      <button
        className="button"
        type="button"
        aria-disabled={!canGoForward}
        onClick={() => canGoForward && onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  )
}
