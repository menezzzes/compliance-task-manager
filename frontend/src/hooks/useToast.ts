import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastKind = 'success' | 'error'

export interface ToastMessage {
  id: number
  text: string
  kind: ToastKind
}

const DURATION_MS: Record<ToastKind, number> = { success: 4000, error: 7000 }

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const nextId = useRef(1)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), DURATION_MS[toast.kind])
    return () => clearTimeout(timer)
  }, [toast])

  const showToast = useCallback((text: string, kind: ToastKind = 'success') => {
    setToast({ id: nextId.current++, text, kind })
  }, [])

  return { toast, showToast }
}
