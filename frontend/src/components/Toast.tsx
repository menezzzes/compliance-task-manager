import type { ToastMessage } from '../hooks/useToast'

export function Toast({ toast }: { toast: ToastMessage | null }) {
  return (
    <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
      {toast && (
        <p key={toast.id} className={`toast toast-${toast.kind}`}>
          {toast.kind === 'error' && <span className="visually-hidden">Error: </span>}
          {toast.text}
        </p>
      )}
    </div>
  )
}
