import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Check, ChevronDown, ChevronRight, Copy, Crown, Settings, Trophy } from 'lucide-react'
import { Avatar, Button, Card, CardLabel, ChoiceGroup, SegmentedControl, cn } from '../../components/ui'
import { GroupFeed } from '../../components/group/GroupFeed'
import { GroupCalendar } from '../../components/group/GroupCalendar'
import { GroupSettingsSheet } from '../../components/group/GroupSettingsSheet'
import { api, type GroupDetail } from '../../lib/api'

type Mode = 'feed' | 'calendar'

/**
 * Vista completa del grupo: dos modos que se alternan arriba de todo.
 * Feed para enterarse de lo que hicieron los demás, calendario del grupo
 * para ver el mes de un vistazo.
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

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="app-frame max-w-[440px] flex flex-col gap-5">
        <header className="flex items-center gap-2 -ml-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Volver"
            className="pressable grid place-items-center size-11 rounded-[var(--radius-md)] text-ink-300 hover:text-ink-50 hover:bg-ink-850 cursor-pointer"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-headline truncate leading-tight">{group.name}</h1>
            <p className="tape text-text-faint">
              {group.memberCount} {group.memberCount === 1 ? 'miembro' : 'miembros'} · meta {group.baseGoal}×
            </p>
          </div>

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

        {/* --- Panel plegable con los datos del grupo --- */}
        <section>
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            className="pressable flex items-center gap-3 w-full min-h-[var(--size-touch)] px-3.5 py-2 rounded-[var(--radius-md)] bg-ink-900 border border-ink-700 hover:border-ink-600 cursor-pointer"
          >
            <span className="flex-1 text-left tape text-text-faint">
              Código <span className="num text-accent text-label tracking-[0.08em]">{group.inviteCode}</span>
              <span className="mx-2 text-ink-700">·</span>
              Tu meta <span className="num text-ink-100 text-label">{group.effectiveGoal}×</span>
            </span>
            <ChevronDown
              size={18}
              strokeWidth={2.5}
              className={cn('text-ink-400 transition-transform duration-[var(--duration-fast)]', panelOpen && 'rotate-180')}
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
                <div className="flex flex-col gap-5 pt-3">
                  <Card tone="accent" notch>
                    <CardLabel>Invitar al grupo</CardLabel>
                    <div className="flex items-center justify-between gap-3">
                      <span className="num text-stat text-accent tracking-[0.08em]">{group.inviteCode}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={copyCode}
                        icon={copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
                      >
                        {copied ? 'Copiado' : 'Copiar'}
                      </Button>
                    </div>
                  </Card>

                  <div className="flex flex-col gap-3">
                    <CardLabel className="mb-0">Tu meta aquí</CardLabel>
                    <p className="text-caption text-text-muted -mt-1">
                      {group.personalGoal === null
                        ? `Vas con la del grupo: ${group.baseGoal} por semana.`
                        : `Te pusiste ${group.personalGoal} por semana en lugar de ${group.baseGoal}.`}
                    </p>
                    <ChoiceGroup
                      label="Tu meta personal en este grupo"
                      columns={4}
                      value={group.personalGoal}
                      onChange={(goal) => void setPersonalGoal(goal)}
                      options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({
                        value: n,
                        label: <span className="num text-title">{n}</span>,
                      }))}
                    />
                    {group.personalGoal !== null && (
                      <Button variant="ghost" onClick={() => void setPersonalGoal(null)} disabled={saving}>
                        Volver a la meta del grupo ({group.baseGoal}×)
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <CardLabel className="mb-0">Miembros ({group.memberCount})</CardLabel>
                    {group.members.map((member) => (
                      <Link
                        key={member.id}
                        to={`/u/${member.id}`}
                        className={cn(
                          'pressable flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)] border',
                          member.isMe ? 'bg-ink-850 border-accent-line' : 'bg-surface border-line-soft hover:border-ink-600',
                        )}
                      >
                        <Avatar name={member.name} image={member.image} size={36} />
                        <span className="flex-1 min-w-0 flex items-center gap-1.5">
                          <span className="font-bold truncate leading-tight">{member.name}</span>
                          {member.isMe && <span className="tape text-accent">tú</span>}
                          {member.role === 'owner' && (
                            <Crown size={13} strokeWidth={2.5} className="text-warning shrink-0" />
                          )}
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* --- Recap: no entra en el toggle porque no es un "modo" del grupo,
                es una pantalla aparte que se mira una vez por mes. --- */}
        <Link
          to={`/groups/${group.id}/recap`}
          className="pressable flex items-center gap-3 px-3.5 py-3 rounded-[var(--radius-md)] bg-ink-900 border border-ink-700 hover:border-accent cursor-pointer"
        >
          <span className="grid place-items-center size-9 shrink-0 rounded-[var(--radius-sm)] bg-accent-tint text-accent">
            <Trophy size={18} strokeWidth={2.5} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold leading-tight">Recap del mes</span>
            <span className="block tape text-text-faint">quién la rompió y quién no</span>
          </span>
          <ChevronRight size={18} strokeWidth={2.5} className="text-ink-500 shrink-0" />
        </Link>

        {/* --- El toggle: los dos modos del grupo --- */}
        <SegmentedControl
          label="Modo del grupo"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'feed', label: 'Feed' },
            { value: 'calendar', label: 'Calendario' },
          ]}
        />

        <div className="pb-10">
          {mode === 'feed' ? (
            <GroupFeed groupId={group.id} />
          ) : (
            <GroupCalendar groupId={group.id} />
          )}
        </div>
      </div>

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
