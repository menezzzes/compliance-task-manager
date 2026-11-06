import { describe, expect, it } from 'vitest'
import { LOCAL_API_URL, resolveApiUrl } from './config'

describe('resolveApiUrl', () => {
  it('uses the configured URL in production', () => {
    expect(resolveApiUrl({ VITE_API_URL: 'https://api.example.com/api/v1', PROD: true })).toBe(
      'https://api.example.com/api/v1',
    )
  })

  it.each(['https://api.example.com/api/v1/', 'https://api.example.com/api/v1///', ' https://api.example.com/api/v1/ '])(
    'removes trailing slashes and surrounding spaces from "%s"',
    (value) => {
      expect(resolveApiUrl({ VITE_API_URL: value, PROD: true })).toBe('https://api.example.com/api/v1')
    },
  )

  it.each([undefined, '', '   ', '/'])('returns null in production when the URL is %j', (value) => {
    expect(resolveApiUrl({ VITE_API_URL: value, PROD: true })).toBeNull()
  })

  it.each([undefined, '', '   '])('falls back to the local API in development when the URL is %j', (value) => {
    expect(resolveApiUrl({ VITE_API_URL: value, PROD: false })).toBe(LOCAL_API_URL)
  })

  it('uses the configured URL in development too', () => {
    expect(resolveApiUrl({ VITE_API_URL: 'http://127.0.0.1:4000/api/v1/', PROD: false })).toBe(
      'http://127.0.0.1:4000/api/v1',
    )
  })
})
