export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="message" role="alert">
      <p className="message-title">Could not load tasks</p>
      <button className="button" type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
