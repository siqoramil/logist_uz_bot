import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { AccessGrant } from '@entities/access-grant'
import { Icon } from '@shared/ui'
import { apiErrorTranslationKey } from '@shared/api'
import { useDeleteAccess, useToggleAccess, useUpdateAccessFullName } from '../api/access-queries'

interface AccessActionsProps {
  grant: AccessGrant
  active: boolean
}

export function AccessActions({ grant, active }: AccessActionsProps) {
  const { t } = useTranslation()
  const toggle = useToggleAccess()
  const remove = useDeleteAccess()
  const updateFullName = useUpdateAccessFullName()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(grant.fullName ?? '')

  const saveFullName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateFullName.mutate({ id: grant.id, fullName }, { onSuccess: () => setEditing(false) })
  }

  const deleteGrant = () => {
    const identity = grant.username ? `@${grant.username}` : `+${grant.phone}`
    if (window.confirm(t('actions.deleteConfirm', { identity }))) remove.mutate(grant.id)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        <button onClick={() => { setFullName(grant.fullName ?? ''); setEditing(true); updateFullName.reset() }} title={t('actions.editFullName')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-ink-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
          <Icon name="pencil" className="h-4 w-4" />
        </button>
        <button onClick={() => toggle.mutate({ id: grant.id, enabled: !active })} disabled={toggle.isPending} title={active ? t('actions.block') : t('actions.activate')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-ink-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40">
          <Icon name={active ? 'pause' : 'play'} className="h-4 w-4" />
        </button>
        <button onClick={deleteGrant} disabled={remove.isPending} title={t('actions.delete')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-ink-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </div>
      {(toggle.error || remove.error) && <p className="max-w-64 text-right text-xs font-semibold text-red-600" role="alert">{t(apiErrorTranslationKey(toggle.error ?? remove.error))}</p>}
      {editing && <div className="fixed inset-0 z-[60] grid place-items-center bg-ink-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(false) }}><form onSubmit={saveFullName} className="w-full max-w-md rounded-3xl bg-white p-6 text-left shadow-[0_24px_80px_rgba(16,29,26,0.3)]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{t('actions.edit')}</p><h2 className="mt-1 text-xl font-black text-ink-950">{t('actions.editFullName')}</h2></div><button type="button" onClick={() => setEditing(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-ink-500"><Icon name="x" className="h-4 w-4" /></button></div><label className="mt-6 block"><span className="mb-2 block text-sm font-bold text-ink-700">{t('form.fullName')}</span><input value={fullName} onChange={(event) => setFullName(event.target.value.slice(0, 100))} className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" minLength={2} maxLength={100} autoFocus required /></label>{updateFullName.error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{t(apiErrorTranslationKey(updateFullName.error))}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditing(false)} className="h-11 rounded-xl border border-slate-200 px-5 font-bold text-ink-500">{t('common.cancel')}</button><button disabled={updateFullName.isPending} className="h-11 rounded-xl bg-brand-600 px-5 font-extrabold text-white disabled:opacity-50">{updateFullName.isPending ? t('actions.saving') : t('actions.save')}</button></div></form></div>}
    </div>
  )
}
