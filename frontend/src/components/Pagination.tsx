import type { PaginationMeta } from '../types'
import { describePageRange } from '../utils/taskQuery'

interface PaginationProps {
  meta: PaginationMeta
  currentPage: number
  onPageChange: (page: number) => void
}

export function Pagination({ meta, currentPage, onPageChange }: PaginationProps) {
  const canGoBack = currentPage > 1
  const canGoForward = currentPage < meta.total_pages
  const pageRange = describePageRange(meta)

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
      <div className="pagination-label">
        {pageRange && (
          <>
            <span>{pageRange}</span>
            <span>
              Page {meta.page} of {meta.total_pages}
            </span>
          </>
        )}
      </div>
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
