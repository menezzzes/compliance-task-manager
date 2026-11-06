export const LOCAL_API_URL = 'http://localhost:3000/api/v1'

export interface ApiUrlEnv {
  VITE_API_URL?: string
  PROD: boolean
}

export function resolveApiUrl({ VITE_API_URL, PROD }: ApiUrlEnv): string | null {
  const configured = (VITE_API_URL ?? '').trim().replace(/\/+$/, '')
  if (configured) return configured
  return PROD ? null : LOCAL_API_URL
}

export const API_URL = resolveApiUrl(import.meta.env)
