import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MissingApiUrl } from './MissingApiUrl'

describe('MissingApiUrl', () => {
  it('explains that the API URL is missing and how to fix it', () => {
    render(<MissingApiUrl />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The API URL is not configured')
    expect(alert).toHaveTextContent('Set VITE_API_URL')
    expect(screen.queryByRole('button', { name: 'New task' })).not.toBeInTheDocument()
  })
})
