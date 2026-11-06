import { Icon } from './Icon'

export function MissingApiUrl() {
  return (
    <>
      <header className="app-header">
        <div className="container app-header-content">
          <h1 className="app-title">Compliance Task Manager</h1>
        </div>
      </header>

      <main className="container app-main">
        <div className="message" role="alert">
          <span className="message-icon message-icon-error">
            <Icon name="alert" />
          </span>
          <p className="message-title">The API URL is not configured</p>
          <p className="message-text">
            Set VITE_API_URL to the backend address, for example https://api.example.com/api/v1, and build the app
            again.
          </p>
        </div>
      </main>
    </>
  )
}
