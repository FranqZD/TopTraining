import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Check, ChevronDown, ChevronRight, Copy, Crown, Settings, Share, Trophy } from 'lucide-react'
import { Avatar, Button, CardLabel, SegmentedControl, Sheet, cn } from '../../components/ui'
import { GroupFeed } from '../../components/group/GroupFeed'
import { GroupCalendar } from '../../components/group/GroupCalendar'
import { GroupSettingsSheet } from '../../components/group/GroupSettingsSheet'
import { api, type GroupDetail, type GroupMemberView } from '../../lib/api'

type Mode = 'feed' | 'calendar'

/**
 * Vista completa del grupo: dos modos que se alternan arriba de todo, más el
 * atajo al recap del mes.
 *
 * La barra de arriba (volver, nombre y los modos) va pegada: el feed y el
 * calendario son largos, y sin eso cambiar de modo obliga a subir hasta el
 * principio cada vez.
 *
 * Los datos del grupo (código, tu meta, miembros) viven en un panel plegado:
 * se consultan de vez en cuando, no compiten con el contenido.
 */
export function GroupDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [mode, setMode] = useState<Mode>('feed')
  const [panelOpen, setPanelOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setGroup(await api.get<GroupDetail>(`/groups/${id}`))
    } catch {
      setNotFound(true)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  /** Elegir el número del grupo es volver a heredarlo, no clavárselo propio. */
  const setPersonalGoal = async (goal: number | null) => {
    setSaving(true)
    try {
      await api.patch(`/groups/${id}/me`, { personalGoal: goal })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const copyCode = async () => {
    if (!group) return
    try {
      await navigator.clipboard.writeText(group.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* el código está a la vista igual */
    }
  }

  const shareCode = async () => {
    if (!group) return
    const text = `Éntrale a ${group.name} en Top Training con el código ${group.inviteCode}.`
    try {
      if (navigator.share) await navigator.share({ title: group.name, text })
      else await copyCode()
    } catch {
      /* lo canceló: no hay nada que avisar */
    }
  }

  if (notFound) {
    return (
      <div className="min-h-dvh bg-canvas grid place-items-center px-5">
        <div className="text-center flex flex-col gap-4">
          <p className="text-title">Este grupo no existe o no eres miembro.</p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Volver
          </Button>
        </div>
      </div>
    )
  }

  if (!group) return null

  const withOwnGoal = group.members.filter((member) => member.personalGoal !== null).length

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="app-frame max-w-[440px] flex flex-col gap-5">
        {/* --- Barra pegada: volver, nombre y los modos --- */}
        <div
          className={cn(
            'sticky top-[env(safe-area-inset-top,0px)] z-30 -mx-5 px-5 pb-3 bg-canvas flex flex-col gap-3',
            // Tapa la franja del notch, que si no deja pasar el contenido.
            'before:absolute before:inset-x-0 before:bottom-full before:h-[env(safe-area-inset-top,0px)] before:bg-canvas',
          )}
        >
          <header className="flex items-center gap-2 -ml-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Volver"
              className="pressable grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] text-ink-300 hover:text-ink-50 hover:bg-ink-850 cursor-pointer"
            >
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <h1 className="flex-1 min-w-0 text-headline truncate leading-tight">{group.name}</h1>

            {/* El engranaje solo existe para quien puede tocar algo. */}
            {group.isOwner && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Ajustes del grupo"
                className="pressable grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] bg-ink-850 border border-ink-700 text-ink-300 hover:text-ink-50 cursor-pointer"
              >
                <Settings size={20} strokeWidth={2.5} />
              </button>
            )}
          </header>

          <div className="flex items-stretch gap-2">
            <SegmentedControl
              className="flex-1"
              label="Modo del grupo"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'feed', label: 'Feed' },
                { value: 'calendar', label: 'Calendario' },
              ]}
            />
            {/* El recap no es un modo: es otra pantalla, y por eso es un botón
                chico al lado y no un tercio de la barra. */}
            <Link
              to={`/groups/${group.id}/recap`}
              aria-label="Recap del mes"
              className="pressable grid place-items-center w-12 shrink-0 rounded-[var(--radius-md)] bg-ink-900 border border-ink-700 text-warning hover:border-accent cursor-pointer"
            >
              <Trophy size={20} strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        {/* --- Panel plegable con los datos del grupo --- */}
        <section className="rounded-[var(--radius-lg)] bg-surface border border-line-soft overflow-hidden">
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            className="pressable flex items-center gap-3 w-full min-h-[var(--size-touch)] px-4 py-2.5 hover:bg-ink-850 cursor-pointer"
          >
            <span className="flex-1 text-left tape text-text-faint">Grupo</span>
            <span className="num text-label text-accent tracking-[0.08em]">{group.inviteCode}</span>
            <ChevronDown
              size={18}
              strokeWidth={2.5}
              className={cn(
                'text-ink-400 shrink-0 transition-transform duration-[var(--duration-fast)]',
                panelOpen && 'rotate-180',
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {panelOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                {/* --- Invitar --- */}
                <div className="flex items-center gap-2.5 px-4 py-3.5 border-t border-line-soft">
                  <div className="flex-1 min-w-0">
                    <CardLabel className="mb-1.5">Invitar</CardLabel>
                    <p className="num text-headline text-accent tracking-[0.08em] leading-none truncate">
                      {group.inviteCode}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={copyCode}
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
                </div>

                {/* --- Tu meta --- */}
                <div className="px-4 py-3.5 border-t border-line-soft">
                  <div className="flex items-baseline justify-between gap-3 mb-2.5">
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
                          disabled={saving}
                          onClick={() => void setPersonalGoal(goal === group.baseGoal ? null : goal)}
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
                </div>

                {/* --- Miembros --- */}
                <button
                  type="button"
                  onClick={() => setMembersOpen(true)}
                  className="pressable flex items-center gap-3 w-full px-4 py-3 border-t border-line-soft hover:bg-ink-850 cursor-pointer"
                >
                  <AvatarStack members={group.members} />
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block font-bold leading-tight">
                      {group.memberCount} {group.memberCount === 1 ? 'miembro' : 'miembros'}
                    </span>
                    <span className="block text-caption text-text-muted">
                      {withOwnGoal === 0
                        ? `Todos con la meta del grupo (${group.baseGoal}×)`
                        : `${withOwnGoal} con meta propia`}
                    </span>
                  </span>
                  <ChevronRight size={18} strokeWidth={2.5} className="text-ink-500 shrink-0" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="pb-10">
          {mode === 'feed' ? <GroupFeed groupId={group.id} /> : <GroupCalendar groupId={group.id} />}
        </div>
      </div>

      <Sheet
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title={<span className="text-title">Miembros ({group.memberCount})</span>}
      >
        <div className="flex flex-col gap-2">
          {group.members.map((member) => (
            <Link
              key={member.id}
              to={`/u/${member.id}`}
              onClick={() => setMembersOpen(false)}
              className={cn(
                'pressable flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)] border',
                member.isMe ? 'bg-ink-850 border-accent-line' : 'bg-surface border-line-soft hover:border-ink-600',
              )}
            >
              <Avatar name={member.name} image={member.image} size={36} />
              <span className="flex-1 min-w-0 flex items-center gap-1.5">
                <span className="font-bold truncate leading-tight">{member.name}</span>
                {member.isMe && <span className="tape text-accent shrink-0">tú</span>}
                {member.role === 'owner' && <Crown size={13} strokeWidth={2.5} className="text-warning shrink-0" />}
              </span>
              <span className="text-right shrink-0">
                <span className="num text-title text-ink-100">{member.effectiveGoal}×</span>
                <span className="block tape text-text-faint">
                  {member.personalGoal === null ? 'del grupo' : 'propia'}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Sheet>

      {group.isOwner && (
        <GroupSettingsSheet
          group={group}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onChanged={load}
          onDeleted={() => navigate('/', { replace: true })}
        />
      )}
    </div>
  )
}

/** Las primeras caras, montadas una sobre otra, y cuántas quedaron afuera. */
function AvatarStack({ members }: { members: GroupMemberView[] }) {
  const shown = members.slice(0, 4)
  const rest = members.length - shown.length

  return (
    <span className="flex shrink-0" aria-hidden>
      {shown.map((member, index) => (
        <Avatar
          key={member.id}
          name={member.name}
          image={member.image}
          size={34}
          className={cn('border-2 border-surface', index > 0 && '-ml-2.5')}
        />
      ))}
      {rest > 0 && (
        <span className="num text-caption grid place-items-center size-[34px] shrink-0 -ml-2.5 rounded-full bg-ink-800 border-2 border-surface text-ink-200">
          +{rest}
        </span>
      )}
    </span>
  )
}
