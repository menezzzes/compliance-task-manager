import type { TaskEvent } from '../types'
import { describeEvent } from '../utils/describeEvent'

export function HistoryEvent({ event }: { event: TaskEvent }) {
  const { typeLabel, occurredAt, initialValues, changes } = describeEvent(event)

  return (
    <li className={`history-event history-event-${event.event_type}`}>
      <div className="history-event-heading">
        <h3 className="history-event-type">{typeLabel}</h3>
        <time className="history-event-time" dateTime={event.created_at}>
          {occurredAt}
        </time>
      </div>

      {initialValues.length > 0 && (
        <>
          <p className="history-caption">Initial values</p>
          <ul className="history-details">
            {initialValues.map(({ label, value }) => (
              <li key={label}>
                <span className="history-field">{label}:</span> {value}
              </li>
            ))}
          </ul>
        </>
      )}

      {changes.length > 0 && (
        <ul className="history-details">
          {changes.map(({ label, before, after }) => (
            <li key={label}>
              <span className="history-field">{label}:</span> {before}{' '}
              <span aria-hidden="true">→</span>
              <span className="visually-hidden">changed to</span> {after}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
