import type { SVGProps } from 'react'

export type IconName = 'users' | 'user' | 'pencil' | 'check' | 'link' | 'bot' | 'search' | 'plus' | 'logout' | 'phone' | 'at' | 'trash' | 'pause' | 'play' | 'refresh' | 'eye' | 'eyeOff' | 'chevronDown' | 'x' | 'chart' | 'wallet' | 'calendar'

const paths: Record<IconName, React.ReactNode> = {
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  pencil: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
  check: <><path d="M20 6 9 17l-5-5"/></>,
  link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
  bot: <><rect width="18" height="13" x="3" y="8" rx="2"/><path d="M12 2v2M8 12h.01M16 12h.01M9 17h6"/></>,
  search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>,
  phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z"/></>,
  at: <><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
  pause: <><path d="M10 4H6v16h4V4ZM18 4h-4v16h4V4Z"/></>,
  play: <><path d="m5 3 14 9-14 9V3z"/></>,
  refresh: <><path d="M20 11a8 8 0 1 0-2.34 5.66L20 19M20 19v-6h-6"/></>,
  eye: <><path d="M2.06 12.35a1 1 0 0 1 0-.7C3.73 7.6 7.64 5 12 5c4.36 0 8.27 2.6 9.94 6.65a1 1 0 0 1 0 .7C20.27 16.4 16.36 19 12 19c-4.36 0-8.27-2.6-9.94-6.65Z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff: <><path d="m3 3 18 18"/><path d="M10.58 10.58a2 2 0 0 0 2.83 2.83M9.88 4.24A10.8 10.8 0 0 1 12 4c4.36 0 8.27 2.6 9.94 6.65a1 1 0 0 1 0 .7 11.4 11.4 0 0 1-2.06 3.25M6.61 6.61a11.5 11.5 0 0 0-4.55 5.04 1 1 0 0 0 0 .7C3.73 16.4 7.64 19 12 19a10.8 10.8 0 0 0 3.12-.46"/></>,
  chevronDown: <><path d="m6 9 6 6 6-6"/></>,
  x: <><path d="M18 6 6 18M6 6l12 12"/></>,
  chart: <><path d="M3 3v18h18M7 16v-3M12 16V8M17 16V5"/></>,
  wallet: <><path d="M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V7"/><path d="M16 14h.01"/></>,
  calendar: <><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
}

export type IconProps<TName extends IconName = IconName> = { name: TName } & SVGProps<SVGSVGElement>

export function Icon<TName extends IconName>({ name, ...props }: IconProps<TName>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}
