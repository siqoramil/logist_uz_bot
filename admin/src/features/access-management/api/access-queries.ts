import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AccessAnalytics, AccessGrant, DashboardStats } from '@entities/access-grant'
import { makeAuthHeader, useSessionStore } from '@entities/session'
import { apiRequest, type ApiError } from '@shared/api'

type ApiEntityResponse<TKey extends string, TEntity> = { [Key in TKey]: TEntity }
type AccessPayload<TFields extends keyof AccessGrant> = Pick<AccessGrant, TFields>

type AccessListResponse = ApiEntityResponse<'grants', AccessGrant[]>
type AccessGrantResponse = ApiEntityResponse<'grant', AccessGrant>
type DeleteAccessResponse = { ok: true }
type AddAccessPayload = AccessPayload<'fullName' | 'username' | 'phone'>
type ToggleAccessPayload = AccessPayload<'id' | 'enabled'>
type UpdateFullNamePayload = AccessPayload<'id' | 'fullName'>

const queryKeys = {
  access: ['access-grants'] as const,
  stats: ['dashboard-stats'] as const,
  analytics: ['access-analytics'] as const,
}

const LIVE_STATUS_REFETCH_MS = 1_000

const useAuthHeader = (): string => {
  const username = useSessionStore((state) => state.username)
  const password = useSessionStore((state) => state.password)
  return makeAuthHeader(username, password)
}

export const useAccessGrants = () => {
  const auth = useAuthHeader()
  return useQuery<AccessListResponse, ApiError>({
    queryKey: queryKeys.access,
    queryFn: () => apiRequest<AccessListResponse>('/access', auth),
    refetchInterval: LIVE_STATUS_REFETCH_MS,
    refetchIntervalInBackground: true,
  })
}

export const useDashboardStats = () => {
  const auth = useAuthHeader()
  return useQuery<DashboardStats, ApiError>({
    queryKey: queryKeys.stats,
    queryFn: () => apiRequest<DashboardStats>('/stats', auth),
    refetchInterval: LIVE_STATUS_REFETCH_MS,
    refetchIntervalInBackground: true,
  })
}

export const useAccessAnalytics = () => {
  const auth = useAuthHeader()
  return useQuery<AccessAnalytics, ApiError>({
    queryKey: queryKeys.analytics,
    queryFn: () => apiRequest<AccessAnalytics>('/analytics', auth),
  })
}

const useInvalidateDashboard = () => {
  const client = useQueryClient()
  return () => Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.access }),
    client.invalidateQueries({ queryKey: queryKeys.stats }),
    client.invalidateQueries({ queryKey: queryKeys.analytics }),
  ])
}

export const useAddAccess = () => {
  const auth = useAuthHeader()
  const invalidate = useInvalidateDashboard()
  return useMutation<AccessGrantResponse, ApiError, AddAccessPayload>({
    mutationFn: (payload) =>
      apiRequest<AccessGrantResponse, AddAccessPayload>('/access', auth, {
        method: 'POST',
        body: payload,
      }),
    onSuccess: invalidate,
  })
}

export const useToggleAccess = () => {
  const auth = useAuthHeader()
  const invalidate = useInvalidateDashboard()
  return useMutation<AccessGrantResponse, ApiError, ToggleAccessPayload>({
    mutationFn: ({ id, enabled }) =>
      apiRequest<AccessGrantResponse, Pick<ToggleAccessPayload, 'enabled'>>(`/access/${id}`, auth, {
        method: 'PATCH',
        body: { enabled },
      }),
    onSuccess: invalidate,
  })
}

export const useUpdateAccessFullName = () => {
  const auth = useAuthHeader()
  const invalidate = useInvalidateDashboard()
  return useMutation<AccessGrantResponse, ApiError, UpdateFullNamePayload>({
    mutationFn: ({ id, fullName }) =>
      apiRequest<AccessGrantResponse, Pick<UpdateFullNamePayload, 'fullName'>>(`/access/${id}`, auth, {
        method: 'PATCH',
        body: { fullName },
      }),
    onSuccess: invalidate,
  })
}

export const useDeleteAccess = () => {
  const auth = useAuthHeader()
  const invalidate = useInvalidateDashboard()
  return useMutation<DeleteAccessResponse, ApiError, AccessGrant['id']>({
    mutationFn: (id) => apiRequest<DeleteAccessResponse>(`/access/${id}`, auth, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}
