export type IconName = 'alert' | 'calendar' | 'check' | 'clipboard' | 'clock' | 'search'

const ICON_PATHS: Record<IconName, string[]> = {
  alert: ['M12 4 3 20h18L12 4Z', 'M12 10v4.5', 'M12 17.5v.01'],
  calendar: ['M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z', 'M4 10.5h16', 'M8.5 3.5V8', 'M15.5 3.5V8'],
  check: ['m5 12.5 4.5 4.5L19 7'],
  clipboard: ['M9 5H6.5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H15', 'M9 3.5h6V7H9V3.5Z', 'm9 14 2.25 2.25L15.5 12'],
  clock: ['M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z', 'M12 7.5V12l3 2'],
  search: ['M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Z', 'm15.5 15.5 4.5 4.5'],
}

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}
