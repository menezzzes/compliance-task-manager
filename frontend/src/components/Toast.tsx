import type { ToastMessage } from '../hooks/useToast'
import { Icon } from './Icon'

export function Toast({ toast }: { toast: ToastMessage | null }) {
  return (
    <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
      {toast && (
        <p key={toast.id} className={`toast toast-${toast.kind}`}>
          <Icon name={toast.kind === 'error' ? 'alert' : 'check'} />
          <span>
            {toast.kind === 'error' && <span className="visually-hidden">Error: </span>}
            {toast.text}
          </span>
        </p>
      )}
    </div>
  )
}
