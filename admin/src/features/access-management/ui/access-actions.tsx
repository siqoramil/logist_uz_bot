import { useTranslation } from 'react-i18next'
import type { AccessGrant } from '@entities/access-grant/model/types'
import { useDeleteAccess, useToggleAccess } from '@features/access-management/api/access-queries'
import { Icon } from '@shared/ui/icon'

export function AccessActions({ grant }: { grant: AccessGrant }) {
  const { t } = useTranslation()
  const toggle = useToggleAccess()
  const remove = useDeleteAccess()

  const deleteGrant = () => {
    if (window.confirm(t('actions.deleteConfirm', { username: grant.username }))) remove.mutate(grant.id)
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button onClick={() => toggle.mutate({ id: grant.id, enabled: !grant.enabled })} disabled={toggle.isPending} title={grant.enabled ? t('actions.block') : t('actions.activate')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-ink-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40">
        <Icon name={grant.enabled ? 'pause' : 'play'} className="h-4 w-4" />
      </button>
      <button onClick={deleteGrant} disabled={remove.isPending} title={t('actions.delete')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-ink-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
        <Icon name="trash" className="h-4 w-4" />
      </button>
    </div>
  )
}
