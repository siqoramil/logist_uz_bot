import { useMutation } from '@tanstack/react-query'
import { makeAuthHeader } from '@entities/session'
import { apiRequest, type ApiError } from '@shared/api'

export interface LoginCredentials {
  readonly username: string
  readonly password: string
}

interface SessionResponse {
  readonly username: string
}

export const useAuthenticate = () => useMutation<SessionResponse, ApiError, LoginCredentials>({
  mutationFn: ({ username, password }) =>
    apiRequest<SessionResponse>('/session', makeAuthHeader(username, password)),
})
