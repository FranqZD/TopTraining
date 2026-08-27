import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Settings, Trophy } from 'lucide-react'
import { Button, SegmentedControl, cn } from '../../components/ui'
import { GroupFeed } from '../../components/group/GroupFeed'
import { GroupCalendar } from '../../components/group/GroupCalendar'
import { GroupSettingsSheet } from '../../components/group/GroupSettingsSheet'
import { VoteWalletBar } from '../../components/group/VoteWalletBar'
import { api, type GroupDetail, type VoteWallet } from '../../lib/api'

type Mode = 'feed' | 'calendar'

/**
 * Vista completa del grupo: dos modos que se alternan arriba de todo, más el
 * atajo al recap del mes.
 *
 * La barra de arriba (volver, nombre y los modos) va pegada: el feed y el
 * calendario son largos, y sin eso cambiar de modo obliga a subir hasta el
 * principio cada vez.
 *
 * Los datos del grupo viven detrás del engranaje: código, tu meta, miembros.
 * El dueño ve además los ajustes de siempre.
 */
export function GroupDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [mode, setMode] = useState<Mode>('feed')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [wallet, setWallet] = useState<VoteWallet | undefined>()

  useEffect(() => {
    setWallet(undefined)
  }, [id])

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

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label={group.isOwner ? 'Ajustes del grupo' : 'Grupo'}
              className="pressable grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] bg-ink-850 border border-ink-700 text-ink-300 hover:text-ink-50 cursor-pointer"
            >
              <Settings size={20} strokeWidth={2.5} />
            </button>
          </header>

          <VoteWalletBar wallet={wallet} />

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

        <div className="pb-10">
          {mode === 'feed' ? (
            <GroupFeed groupId={group.id} isOwner={group.isOwner} onWallet={setWallet} />
          ) : (
            <GroupCalendar groupId={group.id} onWallet={setWallet} />
          )}
        </div>
      </div>

      <GroupSettingsSheet
        group={group}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onChanged={load}
        onDeleted={() => navigate('/', { replace: true })}
      />
    </div>
  )
}

