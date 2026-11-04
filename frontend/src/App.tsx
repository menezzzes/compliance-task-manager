import { useTasks } from './hooks/useTasks'

// Temporary screen: it only proves that the frontend can talk to the API.
function App() {
  const { data, meta, loading, error } = useTasks()

  if (loading) return <p>Loading…</p>
  if (error) return <p role="alert">{error.message}</p>

  return (
    <main>
      <h1>Compliance tasks ({meta?.total ?? 0})</h1>
      <ul>
        {data.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </main>
  )
}

export default App
