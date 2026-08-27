import { useLocation, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { Bell, Camera, Columns2, EyeOff, Lock, PenLine, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, Card, CardLabel } from '../components/ui'
import { RELEASES, type Release, type ReleaseIcon } from '../whats-new/releases'
import { markReleasesSeen, unseenReleases } from '../whats-new/seen'

const ICONS: Record<ReleaseIcon, ReactNode> = {
  camera: <Camera size={20} strokeWidth={2.5} />,
  bell: <Bell size={20} strokeWidth={2.5} />,
  ghost: <EyeOff size={20} strokeWidth={2.5} />,
  bar: <Columns2 size={20} strokeWidth={2.5} />,
  trophy: <Trophy size={20} strokeWidth={2.5} />,
  pen: <PenLine size={20} strokeWidth={2.5} />,
  lock: <Lock size={20} strokeWidth={2.5} />,
}

/**
 * Notas del parche. Se abre sola cuando el dispositivo instala una versión
 * que todavía no vio. Desde Ajustes se puede volver a leer.
 */
export function WhatsNewScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const unread = unseenReleases()
  const releases = unread.length > 0 ? unread : RELEASES

  const done = () => {
    markReleasesSeen()
    const target = from && from !== '/whats-new' ? from : '/'
    navigate(target, { replace: true })
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="app-frame max-w-[440px] flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="tape text-text-faint">Notas del parche</p>
          <h1 className="text-headline">Hay de nuevo</h1>
          <p className="text-body text-text-muted">
            Lo que se sumó en este teléfono. Un toque y seguís.
          </p>
        </header>

        <div className="flex flex-col gap-5 pb-4">
          {releases.map((release, index) => (
            <ReleaseCard key={release.id} release={release} featured={index === 0} />
          ))}
        </div>

        <div className="mt-auto pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sticky bottom-0 bg-linear-to-t from-canvas via-canvas to-transparent">
          <Button size="lg" fullWidth onClick={done}>
            Listo, a entrenar
          </Button>
        </div>
      </div>
    </div>
  )
}

function ReleaseCard({ release, featured }: { release: Release; featured: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card notch={featured} className="flex flex-col gap-4">
        <div>
          <CardLabel className="mb-1.5">{release.dateLabel}</CardLabel>
          <h2 className="text-title leading-tight">{release.title}</h2>
          <p className="text-caption text-text-muted mt-1">{release.tagline}</p>
        </div>

        <ul className="flex flex-col gap-3">
          {release.items.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <span className="grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] bg-ink-850 text-ink-100">
                {ICONS[item.icon]}
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block font-bold leading-tight">{item.title}</span>
                <span className="block text-caption text-text-muted mt-0.5">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </motion.div>
  )
}