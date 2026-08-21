export interface AccessGrant {
  id: string
  username: string
  phone: string
  enabled: boolean
  linkedUserId: number | null
  linkedUsername: string | null
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  total: number
  active: number
  linked: number
  subscribers: number
}
