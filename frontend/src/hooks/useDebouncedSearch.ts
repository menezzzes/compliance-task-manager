import { useEffect, useState } from 'react'

const SEARCH_DELAY_MS = 300

export function useDebouncedSearch(committed: string, onCommit: (text: string) => void) {
  const [draft, setDraft] = useState(committed)
  const [lastCommitted, setLastCommitted] = useState(committed)

  if (committed !== lastCommitted) {
    setLastCommitted(committed)
    if (draft.trim() !== committed) setDraft(committed)
  }

  useEffect(() => {
    const text = draft.trim()
    if (text === committed) return

    const timer = setTimeout(() => onCommit(text), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draft, committed, onCommit])

  return [draft, setDraft] as const
}
