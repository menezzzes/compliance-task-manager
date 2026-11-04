import { Icon } from './Icon'

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="message" role="alert">
      <span className="message-icon message-icon-error">
        <Icon name="alert" />
      </span>
      <p className="message-title">Could not load tasks</p>
      <button className="button" type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
