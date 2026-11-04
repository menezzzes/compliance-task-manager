import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  title: string
  children?: ReactNode
  confirmLabel: string
  busyLabel?: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busyLabel,
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const id = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const descriptionId = children ? `${id}-description` : undefined

  const requestCancel = () => {
    if (!busy) onCancel()
  }

  return (
    <Modal
      role="alertdialog"
      labelledBy={`${id}-title`}
      describedBy={descriptionId}
      initialFocusRef={cancelRef}
      onRequestClose={requestCancel}
    >
      <h2 id={`${id}-title`} className="modal-title">
        {title}
      </h2>
      {children && (
        <div id={descriptionId} className="modal-text">
          {children}
        </div>
      )}
      <div className="modal-actions">
        <button ref={cancelRef} className="button" type="button" disabled={busy} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button className="button button-danger" type="button" disabled={busy} onClick={onConfirm}>
          {busy && busyLabel ? busyLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
