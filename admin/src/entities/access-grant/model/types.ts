export interface AccessGrant {
  readonly id: string
  readonly fullName: string | null
  readonly username: string | null
  readonly phone: string
  readonly enabled: boolean
  readonly linkedUserId: number | null
  readonly linkedUsername: string | null
  readonly expiresAt: string
  readonly billingHistory: ReadonlyArray<{ readonly paidAt: string; readonly amount: number }>
  readonly createdAt: string
  readonly updatedAt: string
}

export interface AccessAnalytics {
  readonly pricePerMonth: number
  readonly activeSubscriptions: number
  readonly expiringSoon: number
  readonly currentMonthRevenue: number
  readonly monthlyRecurringRevenue: number
  readonly totalRevenue: number
  readonly totalPayments: number
  readonly months: ReadonlyArray<{ readonly month: string; readonly revenue: number; readonly payments: number }>
}

export interface DashboardStats {
  readonly total: number
  readonly active: number
  readonly linked: number
  readonly subscribers: number
}
