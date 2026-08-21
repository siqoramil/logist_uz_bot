import { create } from 'zustand'

interface SessionState {
  username: string
  password: string
  authenticated: boolean
  login: (username: string, password: string) => void
  logout: () => void
}

export const makeAuthHeader = (username: string, password: string): string => {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return `Basic ${btoa(binary)}`
}

export const useSessionStore = create<SessionState>()((set) => ({
  username: '',
  password: '',
  authenticated: false,
  login: (username, password) => set({ username, password, authenticated: true }),
  logout: () => set({ username: '', password: '', authenticated: false }),
}))
