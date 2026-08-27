import { useTranslation } from 'react-i18next'
import { AdminProfileForm } from '@features/admin-profile'

export function ProfilePage() {
  const { t } = useTranslation()
  return <><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{t('profile.eyebrow')}</p><h1 className="mt-1 text-3xl font-black tracking-[-0.045em] text-ink-950 md:text-4xl">{t('profile.title')}</h1><p className="mt-2 text-sm text-ink-500">{t('profile.description')}</p></div><AdminProfileForm /></>
}
