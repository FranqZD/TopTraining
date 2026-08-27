import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Check, Copy, Crown, Loader2, Share, Trash2, UserMinus, UserPlus } from 'lucide-react'
import { Avatar, Button, Card, CardLabel, ChoiceGroup, Sheet, cn } from '../ui'
import { api, type Friend, type GroupDetail } from '../../lib/api'

/**
 * Ajustes del grupo, detrás del engranaje. Quien no es dueño ve código, su
 * meta y los miembros. El dueño ve además la meta base, sumar/sacar gente
 * y borrar el grupo.
 */
export function GroupSettingsSheet({
  group,
  open,
  onClose,
  onChanged,
  onDeleted,
}: {
  group: GroupDetail
  open: boolean
  onClose: () => void
  onChanged: () => Promise<void>
  onDeleted: () => void
}) {
  const admin = group.isOwner
  const [friends, setFriends] = useState<Friend[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setConfirmingDelete(false)
      setError(null)
      setCopied(false)
      return
    }
    if (admin) api.get<Friend[]>('/friends').then(setFriends).catch(() => setFriends([]))
  }, [open, admin])

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key)
    setError(null)
    try {
      await action()
      await onChanged()
    } catch {
      setError('No se pudo. Inténtalo de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(group.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* el código está a la vista igual */
    }
  }

  const shareCode = async () => {
    const text = `Éntrale a ${group.name} en Top Training con el código ${group.inviteCode}.`
    try {
      if (navigator.share) await navigator.share({ title: group.name, text })
      else await copyCode()
    } catch {
      /* lo canceló */
    }
  }

  const inGroup = new Set(group.members.map((member) => member.id))
  const invitables = friends.filter((friend) => !inGroup.has(friend.id))

  const remove = async () => {
    setBusy('delete')
    setError(null)
    try {
      await api.del(`/groups/${group.id}`)
      onDeleted()
    } catch {
      setError('No pudimos borrarlo. Inténtalo de nuevo.')
      setBusy(null)
      setConfirmingDelete(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={<span className="text-title">{admin ? 'Ajustes del grupo' : 'Grupo'}</span>}
    >
      <div className="flex flex-col gap-7 pt-1">
        <section className="flex items-center gap-2.5">
          <div className="flex-1 min-w-0">
            <CardLabel className="mb-1.5">Invitar</CardLabel>
            <p className="num text-headline text-accent tracking-[0.08em] leading-none truncate">
              {group.inviteCode}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void copyCode()}
            icon={copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
          >
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <button
            type="button"
            onClick={() => void shareCode()}
            aria-label="Compartir el código"
            className="pressable grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] bg-accent text-on-accent hover:bg-accent-strong cursor-pointer"
          >
            <Share size={18} strokeWidth={2.5} />
          </button>
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <CardLabel className="mb-0">Tu meta semanal</CardLabel>
            <span className="text-caption text-text-muted truncate">
              {group.personalGoal === null ? 'Sigo la del grupo' : `Propia · el grupo va ${group.baseGoal}×`}
            </span>
          </div>
          <div role="radiogroup" aria-label="Tu meta semanal en este grupo" className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((goal) => {
              const selected = goal === group.effectiveGoal
              return (
                <button
                  key={goal}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={busy !== null}
                  onClick={() =>
                    void run('me-goal', () =>
                      api.patch(`/groups/${group.id}/me`, {
                        personalGoal: goal === group.baseGoal ? null : goal,
                      }),
                    )
                  }
                  className={cn(
                    'pressable flex-1 min-w-0 h-11 rounded-[var(--radius-md)] border num text-title cursor-pointer',
                    'transition-colors duration-[var(--duration-fast)] disabled:opacity-50',
                    selected
                      ? 'bg-accent border-accent text-on-accent'
                      : 'bg-ink-850 border-ink-700 text-ink-200 hover:border-ink-600',
                  )}
                >
                  {goal}
                </button>
              )
            })}
          </div>
        </section>

        {admin && (
          <section className="flex flex-col gap-3">
            <CardLabel className="mb-0">Meta del grupo</CardLabel>
            <p className="text-caption text-text-muted -mt-1">
              Entrenos por semana. La hereda todo el que no se haya puesto una propia.
            </p>
            <ChoiceGroup
              label="Meta base del grupo"
              columns={3}
              value={group.baseGoal}
              onChange={(baseGoal) => void run('goal', () => api.patch(`/groups/${group.id}`, { baseGoal }))}
              options={[3, 4, 5].map((n) => ({ value: n, label: <span className="num text-title">{n}×</span> }))}
            />
          </section>
        )}

        <section className="flex flex-col gap-2">
          <CardLabel className="mb-0">Miembros ({group.memberCount})</CardLabel>
          {group.members.map((member) => {
            const owner = member.role === 'owner'
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)] bg-surface border border-line-soft"
              >
                <Link
                  to={`/u/${member.id}`}
                  onClick={onClose}
                  className="pressable flex items-center gap-3 min-w-0 flex-1 cursor-pointer rounded-[var(--radius-sm)]"
                >
                  <Avatar name={member.name} image={member.image} size={36} />
                  <span className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="font-bold truncate leading-tight">{member.name}</span>
                    {member.isMe && <span className="tape text-accent shrink-0">tú</span>}
                    {owner && <Crown size={13} strokeWidth={2.5} className="text-warning shrink-0" />}
                  </span>
                  <span className="text-right shrink-0">
                    <span className="num text-title text-ink-100">{member.effectiveGoal}×</span>
                    <span className="block tape text-text-faint">
                      {member.personalGoal === null ? 'del grupo' : 'propia'}
                    </span>
                  </span>
                </Link>
                {admin && !owner && (
                  <button
                    type="button"
                    onClick={() => void run(member.id, () => api.del(`/groups/${group.id}/members/${member.id}`))}
                    disabled={busy !== null}
                    aria-label={`Sacar a ${member.name} del grupo`}
                    className="pressable grid place-items-center size-11 shrink-0 -mr-1.5 rounded-[var(--radius-md)] text-ink-400 hover:text-danger hover:bg-danger-tint cursor-pointer disabled:opacity-50"
                  >
                    {busy === member.id ? (
                      <Loader2 size={18} strokeWidth={2.5} className="animate-spin" />
                    ) : (
                      <UserMinus size={18} strokeWidth={2.5} />
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </section>

        {admin && (
          <section className="flex flex-col gap-2">
            <CardLabel className="mb-0">Agregar amigos</CardLabel>
            {invitables.length === 0 ? (
              <p className="text-caption text-text-faint">
                {friends.length === 0
                  ? 'Todavía no tienes amigos aceptados. También puedes pasarles el código del grupo.'
                  : 'Ya están todos tus amigos aquí adentro.'}
              </p>
            ) : (
              invitables.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)] bg-ink-900 border border-ink-700"
                >
                  <Avatar name={friend.name} image={friend.image} size={36} />
                  <span className="flex-1 min-w-0 font-bold truncate leading-tight">{friend.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      void run(friend.id, () => api.post(`/groups/${group.id}/members`, { userId: friend.id }))
                    }
                    disabled={busy !== null}
                    aria-label={`Agregar a ${friend.name} al grupo`}
                    className="pressable grid place-items-center size-11 shrink-0 -mr-1.5 rounded-[var(--radius-md)] text-accent hover:bg-accent-tint cursor-pointer disabled:opacity-50"
                  >
                    {busy === friend.id ? (
                      <Loader2 size={18} strokeWidth={2.5} className="animate-spin" />
                    ) : (
                      <UserPlus size={18} strokeWidth={2.5} />
                    )}
                  </button>
                </div>
              ))
            )}
          </section>
        )}

        {error && <p className="text-caption text-danger">{error}</p>}

        {admin && (
          <section className="flex flex-col gap-3 pt-1">
            <CardLabel className="mb-0">Zona de riesgo</CardLabel>
            {confirmingDelete ? (
              <Card tone="outline" className="flex flex-col gap-3 border-danger/45">
                <p className="text-body text-ink-100">¿Borrar “{group.name}”?</p>
                <p className="text-caption text-text-muted">
                  Desaparece para los {group.memberCount}: el feed del grupo, el calendario y los recaps.
                  Los entrenos de cada quien se quedan donde están.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => void remove()}
                    disabled={busy !== null}
                    icon={
                      busy === 'delete' ? (
                        <Loader2 size={18} strokeWidth={2.5} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} strokeWidth={2.5} />
                      )
                    }
                  >
                    Sí, borrar el grupo
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setConfirmingDelete(false)}
                    disabled={busy !== null}
                  >
                    Mejor no
                  </Button>
                </div>
              </Card>
            ) : (
              <Button
                variant="danger"
                fullWidth
                onClick={() => setConfirmingDelete(true)}
                icon={<Trash2 size={18} strokeWidth={2.5} />}
              >
                Borrar grupo
              </Button>
            )}
          </section>
        )}
      </div>
    </Sheet>
  )
}
