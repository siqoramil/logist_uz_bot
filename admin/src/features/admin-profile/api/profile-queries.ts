import { useMutation } from '@tanstack/react-query'
import { makeAuthHeader, useSessionStore } from '@entities/session'
import { apiRequest, type ApiError } from '@shared/api'

export interface UpdateProfilePayload {
  readonly username: string
  readonly currentPassword: string
  readonly newPassword: string
}

interface ProfileResponse {
  readonly username: string
}

export const useUpdateAdminProfile = () => {
  const currentUsername = useSessionStore((state) => state.username)
  const currentPassword = useSessionStore((state) => state.password)
  const login = useSessionStore((state) => state.login)

  return useMutation<ProfileResponse, ApiError, UpdateProfilePayload>({
    mutationFn: (payload) => apiRequest<ProfileResponse, UpdateProfilePayload>(
      '/profile',
      makeAuthHeader(currentUsername, currentPassword),
      { method: 'PATCH', body: payload },
    ),
    onSuccess: (profile, payload) => login(profile.username, payload.newPassword),
  })
}
