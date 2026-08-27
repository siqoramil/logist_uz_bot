export type ApiErrorCode =
  | 'invalid-credentials'
  | 'origin-forbidden'
  | 'admin-build-missing'
  | 'missing-fields'
  | 'invalid-full-name'
  | 'invalid-username'
  | 'invalid-phone'
  | 'username-in-use'
  | 'phone-in-use'
  | 'invalid-enabled'
  | 'access-not-found'
  | 'endpoint-not-found'
  | 'invalid-json'
  | 'request-too-large'
  | 'validation-error'
  | 'duplicate-access'
  | 'invalid-admin-username'
  | 'invalid-current-password'
  | 'weak-password'
  | 'network-error'
  | 'invalid-response'
  | 'server-error'
  | 'unknown'

const API_ERROR_CODES = new Set<ApiErrorCode>([
  'invalid-credentials', 'origin-forbidden', 'admin-build-missing', 'missing-fields',
  'invalid-full-name', 'invalid-username', 'invalid-phone', 'username-in-use', 'phone-in-use',
  'invalid-enabled', 'access-not-found', 'endpoint-not-found', 'invalid-json',
  'request-too-large', 'validation-error', 'duplicate-access', 'network-error',
  'invalid-admin-username', 'invalid-current-password', 'weak-password',
  'invalid-response', 'server-error', 'unknown',
])

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode

  constructor(message: string, status: number, code: ApiErrorCode) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const apiErrorTranslationKey = (error: unknown): string =>
  `errors.codes.${error instanceof ApiError ? error.code : 'unknown'}`

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''

export type ApiRequestInit<TBody = never> = Omit<RequestInit, 'body'> & {
  body?: TBody
}

export async function apiRequest<TResponse, TBody = never>(path: string, authHeader: string, init?: ApiRequestInit<TBody>): Promise<TResponse> {
  let requestBody: TBody | undefined
  let requestInit: Omit<ApiRequestInit<TBody>, 'body'> = {}
  if (init) {
    const { body, ...rest } = init
    requestBody = body
    requestInit = rest
  }
  let response: Response
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      ...requestInit,
      ...(requestBody === undefined ? {} : { body: JSON.stringify(requestBody) }),
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        ...requestInit.headers,
      },
    })
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : 'Network error', 0, 'network-error')
  }
  const body = (await response.json().catch(() => null)) as { error?: string; code?: string } | null
  if (!response.ok) {
    const code = body?.code && API_ERROR_CODES.has(body.code as ApiErrorCode)
      ? body.code as ApiErrorCode
      : response.status >= 500 ? 'server-error' : 'unknown'
    throw new ApiError(body?.error ?? 'Server error', response.status, code)
  }
  if (body === null) throw new ApiError('Invalid server response', response.status, 'invalid-response')
  return body as TResponse
}
