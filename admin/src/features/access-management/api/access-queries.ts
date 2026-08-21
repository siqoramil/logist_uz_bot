import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AccessGrant, DashboardStats } from '@entities/access-grant/model/types'
import { makeAuthHeader, useSessionStore } from '@entities/session/model/session-store'
import { apiRequest } from '@shared/api/request'

const useAuthHeader = () => {
  const username = useSessionStore((state) => state.username)
  const password = useSessionStore((state) => state.password)
  return makeAuthHeader(username, password)
}

export const useAccessGrants = () => {
  const auth = useAuthHeader()
  return useQuery({
    queryKey: ['access-grants'],
    queryFn: () => apiRequest<{ grants: AccessGrant[] }>('/access', auth),
  })
}

export const useDashboardStats = () => {
  const auth = useAuthHeader()
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiRequest<DashboardStats>('/stats', auth),
  })
}

const useInvalidateDashboard = () => {
  const client = useQueryClient()
  return () => Promise.all([
    client.invalidateQueries({ queryKey: ['access-grants'] }),
    client.invalidateQueries({ queryKey: ['dashboard-stats'] }),
  ])
}

export const useAddAccess = () => {
  const auth = useAuthHeader()
  const invalidate = useInvalidateDashboard()
  return useMutation({
    mutationFn: (payload: { username: string; phone: string }) =>
      apiRequest<{ grant: AccessGrant }>('/access', auth, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: invalidate,
  })
}

export const useToggleAccess = () => {
  const auth = useAuthHeader()
  const invalidate = useInvalidateDashboard()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiRequest<{ grant: AccessGrant }>(`/access/${id}`, auth, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: invalidate,
  })
}

export const useDeleteAccess = () => {
  const auth = useAuthHeader()
  const invalidate = useInvalidateDashboard()
  return useMutation({
    mutationFn: (id: string) => apiRequest<{ ok: true }>(`/access/${id}`, auth, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}
