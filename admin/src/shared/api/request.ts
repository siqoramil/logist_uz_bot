export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export async function apiRequest<T>(path: string, authHeader: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const body = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) throw new ApiError(body.error ?? 'Server bilan aloqa xatosi', response.status)
  return body as T
}
