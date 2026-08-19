import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, MessageSquarePlus, X } from 'lucide-react'
import { Button, Card, CardLabel, DayMark, TextField, cn } from '../components/ui'
import { api, localDay, type AppConfig, type CheckIn } from '../lib/api'
import { thumbnail, uploadCheckInPhoto } from '../lib/photo'

/**
 * Check-in del día. Es LA acción de la app, así que el camino corto es
 * sagrado: se abre y se confirma de un toque. Foto y descripción están, pero
 * ninguna se cruza en el camino de quien solo quiere marcar y seguir.
 *
 * Uno por día: si ya entrenó, la pantalla lo muestra y no ofrece repetir.
 */

/** Chips para describir sin teclado. El comentario libre es aparte y opcional. */
const QUICK_TAGS = ['Piernas', 'Pecho', 'Espalda', 'Brazos', 'Hombros', 'Cardio', 'Funcional', 'Fútbol']

type Phase = 'loading' | 'form' | 'done' | 'already'

export function CheckInScreen() {
  const navigate = useNavigate()
  const day = localDay()

  const [phase, setPhase] = useState<Phase>('loading')
  const [existing, setExisting] = useState<CheckIn | null>(null)
  const [photosEnabled, setPhotosEnabled] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [commentOpen, setCommentOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      api.get<{ checkIn: CheckIn | null }>('/checkins/latest').catch(() => ({ checkIn: null })),
      api.get<AppConfig>('/config').catch(() => ({ providers: [], photoUploads: false })),
    ]).then(([latest, config]) => {
      setPhotosEnabled(config.photoUploads)
      if (latest.checkIn?.day === day) {
        setExisting(latest.checkIn)
        setPhase('already')
      } else {
        setPhase('form')
      }
    })
  }, [day])

  // La preview es un object URL: hay que soltarlo o queda pinchada la memoria.
  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const toggleTag = (tag: string) =>
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]))

  /** Nota final: los chips arman la descripción; el comentario libre se suma. */
  const buildNote = () => {
    const head = tags.join(' · ')
    const tail = comment.trim()
    if (head && tail) return `${head} — ${tail}`
    return head || tail || undefined
  }

  const confirm = async () => {
    setSubmitting(true)
    setError(null)
    try {
      let photo: { url: string; publicId: string } | null = null
      if (file && photosEnabled) photo = await uploadCheckInPhoto(file, day)

      const checkIn = await api.post<CheckIn>('/checkins', {
        day,
        note: buildNote(),
        photoUrl: photo?.url,
        photoPublicId: photo?.publicId,
      })
      setExisting(checkIn)
      setPhase('done')
      setTimeout(() => navigate('/', { replace: true }), 1900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar el check-in')
      setSubmitting(false)
    }
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-dvh bg-canvas grid place-items-center">
        <Loader2 size={28} strokeWidth={2.5} className="animate-spin text-accent" />
      </div>
    )
  }

  if (phase === 'done') return <SuccessState checkIn={existing} />

  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      <div className="mx-auto w-full max-w-[440px] px-5 py-6 flex flex-col flex-1 gap-6">
        <header className="flex items-center gap-2 -ml-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Volver"
            className="pressable grid place-items-center size-11 rounded-[var(--radius-md)] text-ink-300 hover:text-ink-50 hover:bg-ink-850 cursor-pointer"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <div>
            <p className="tape text-text-faint">{formatDay(day)}</p>
            <h1 className="text-headline">{phase === 'already' ? 'Ya entrenaste' : 'Marcar entreno'}</h1>
          </div>
        </header>

        {phase === 'already' ? (
          <AlreadyCheckedIn checkIn={existing} onBack={() => navigate('/')} />
        ) : (
          <>
            {/* --- Foto (opcional) --- */}
            {photosEnabled && (
              <section className="flex flex-col gap-3">
                <CardLabel className="mb-0">Foto · opcional</CardLabel>

                {preview ? (
                  <div className="relative rounded-[var(--radius-lg)] overflow-hidden border border-ink-700">
                    <img src={preview} alt="Vista previa del entreno" className="w-full aspect-square object-cover" />
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      aria-label="Quitar la foto"
                      className="pressable absolute top-3 right-3 grid place-items-center size-11 rounded-full bg-ink-1000/80 backdrop-blur border border-ink-700 text-ink-100 cursor-pointer"
                    >
                      <X size={20} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <PhotoButton onClick={() => cameraInput.current?.click()} icon={<Camera size={26} strokeWidth={2} />}>
                      Sacar foto
                    </PhotoButton>
                    <PhotoButton onClick={() => galleryInput.current?.click()} icon={<ImageIcon size={26} strokeWidth={2} />}>
                      Galería
                    </PhotoButton>
                  </div>
                )}

                <input
                  ref={cameraInput}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <input
                  ref={galleryInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </section>
            )}

            {/* --- Descripción sin teclado --- */}
            <section className="flex flex-col gap-3">
              <CardLabel className="mb-0">Qué hiciste · opcional</CardLabel>
              <div className="flex flex-wrap gap-2">
                {QUICK_TAGS.map((tag) => {
                  const selected = tags.includes(tag)
                  return (
                    <motion.button
                      key={tag}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleTag(tag)}
                      whileTap={{ scale: 0.94 }}
                      className={cn(
                        'min-h-[var(--size-touch)] px-4 rounded-[var(--radius-pill)] border cursor-pointer',
                        'text-label font-bold transition-colors duration-[var(--duration-fast)]',
                        selected
                          ? 'bg-accent border-accent text-on-accent'
                          : 'bg-ink-850 border-ink-700 text-ink-200 hover:border-ink-600',
                      )}
                    >
                      {tag}
                    </motion.button>
                  )
                })}
              </div>

              {commentOpen ? (
                <TextField
                  name="comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Cómo te fue…"
                  maxLength={280}
                  autoFocus
                />
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setCommentOpen(true)}
                  icon={<MessageSquarePlus size={18} strokeWidth={2.5} />}
                  className="self-start !px-3"
                >
                  Agregar un comentario
                </Button>
              )}
            </section>

            {error && (
              <p className="text-caption text-danger bg-danger-tint border border-danger/30 rounded-[var(--radius-sm)] px-3 py-2">
                {error}
              </p>
            )}

            {/* --- Confirmar: siempre alcanzable, siempre habilitado --- */}
            <div className="mt-auto pt-4 pb-6 sticky bottom-0 bg-linear-to-t from-canvas via-canvas to-transparent">
              <Button
                size="lg"
                fullWidth
                onClick={confirm}
                disabled={submitting}
                icon={submitting ? <Loader2 size={20} strokeWidth={2.5} className="animate-spin" /> : undefined}
              >
                {submitting ? (file ? 'Subiendo foto…' : 'Guardando…') : 'Confirmar entrenamiento'}
              </Button>
              <p className="text-caption text-text-faint text-center mt-3">
                No hace falta llenar nada. Un toque y listo.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* --- Piezas ------------------------------------------------------------- */

function PhotoButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable flex flex-col items-center justify-center gap-2 min-h-[7rem] cursor-pointer rounded-[var(--radius-lg)] bg-ink-850 border border-ink-700 text-ink-200 hover:border-accent hover:bg-ink-800"
    >
      {icon}
      <span className="text-label font-bold">{children}</span>
    </button>
  )
}

function AlreadyCheckedIn({ checkIn, onBack }: { checkIn: CheckIn | null; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-5 flex-1">
      <Card tone="accent" notch className="flex items-center gap-4">
        <DayMark state="done" size="lg" animate />
        <div className="min-w-0">
          <p className="text-title leading-tight">Ya entrenaste hoy</p>
          <p className="text-caption text-text-muted">Uno por día. Volvé mañana.</p>
        </div>
      </Card>

      {checkIn?.photoUrl && (
        <img
          src={thumbnail(checkIn.photoUrl, 800)}
          alt="Foto de tu entreno de hoy"
          className="w-full aspect-square object-cover rounded-[var(--radius-lg)] border border-ink-700"
        />
      )}

      {checkIn?.note && (
        <Card>
          <CardLabel>Lo que anotaste</CardLabel>
          <p className="text-body text-ink-100">{checkIn.note}</p>
        </Card>
      )}

      <div className="mt-auto pb-6">
        <Button size="lg" variant="secondary" fullWidth onClick={onBack}>
          Volver al inicio
        </Button>
      </div>
    </div>
  )
}

function SuccessState({ checkIn }: { checkIn: CheckIn | null }) {
  return (
    <div className="min-h-dvh bg-canvas grid place-items-center px-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        className="flex flex-col items-center text-center gap-5"
      >
        <motion.div
          initial={{ scale: 0.4, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 20, delay: 0.08 }}
        >
          <div className="grid place-items-center size-24 rounded-[var(--radius-xl)] bg-success text-ink-1000 shadow-[0_20px_60px_-20px_var(--color-success)]">
            <DayMark state="done" size="lg" className="!bg-transparent !shadow-none !size-16 [&_svg]:!size-12" />
          </div>
        </motion.div>

        <div>
          <h1 className="text-display [font-variation-settings:'wdth'_118] uppercase">Anotado</h1>
          <p className="text-lead text-text-muted mt-2">
            {checkIn?.note ? checkIn.note : 'Tus amigos ya lo están viendo.'}
          </p>
        </div>

        <AnimatePresence>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="tape text-text-faint"
          >
            Volviendo al inicio…
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/** "miércoles 19 de agosto" con la primera en mayúscula. */
function formatDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  const formatted = new Date(year!, month! - 1, date!).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
