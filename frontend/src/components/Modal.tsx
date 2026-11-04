import { useEffect, useRef } from 'react'
import type { KeyboardEvent, MouseEvent, ReactNode, RefObject } from 'react'
import { focusNewTaskButton } from '../utils/focus'

interface ModalProps {
  labelledBy: string
  describedBy?: string
  role?: 'dialog' | 'alertdialog'
  initialFocusRef?: RefObject<HTMLElement | null>
  onRequestClose: () => void
  children: ReactNode
}

export function Modal({
  labelledBy,
  describedBy,
  role = 'dialog',
  initialFocusRef,
  onRequestClose,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pressedOutsideRef = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    initialFocusRef?.current?.focus()

    return () => {
      dialog.close()
      if (opener?.isConnected) opener.focus()
      else focusNewTaskButton()
    }
  }, [initialFocusRef])

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    onRequestClose()
  }

  function handleMouseDown(event: MouseEvent) {
    pressedOutsideRef.current = event.target === dialogRef.current
  }

  function handleClick(event: MouseEvent) {
    if (pressedOutsideRef.current && event.target === dialogRef.current) onRequestClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      role={role}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onCancel={(event) => {
        event.preventDefault()
        onRequestClose()
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="modal-content">{children}</div>
    </dialog>
  )
}
