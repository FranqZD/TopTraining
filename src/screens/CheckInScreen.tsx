import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Camera, Image as ImageIcon, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { Button, Card, CardLabel, DayMark, Sheet, TextField } from '../components/ui'
import { api, localDay, type AppConfig, type CheckIn } from '../lib/api'
import { thumbnail, uploadCheckInPhoto } from '../lib/photo'

/**
 * Check-in del día. Es LA acción de la app, así que el camino corto es
 * sagrado: se abre y se confirma de un toque. Solo dos campos, los dos
 * opcionales: una foto y un comentario.
 *
 * También es la pantalla donde se corrige lo hecho. Marcar por error, olvidarse
 * la foto o querer cambiar lo que escribiste son cosas normales, así que el
 * check-in se puede editar o deshacer siempre — el de hoy y los de otros días,
 * abriéndolos con `?id=`.
 */

type Mode = 'loading' | 'view' | 'form' | 'done'

export function CheckInScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editingId = params.get('id')

  const [mode, setMode] = useState<Mode>('loading')
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null)
  const [photosEnabled, setPhotosEnabled] = useState(false)

  /** Día al que apunta la pantalla: hoy, o el del check-in que se está editando. */
  const day = checkIn?.day ?? localDay()

  // --- Estado del formulario ---
  const [file, setFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  /** Foto ya guardada. null cuando se quitó. */
  const [savedPhoto, setSavedPhoto] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const today = localDay()
    const load = editingId
      ? api.get<CheckIn>(`/checkins/${editingId}`)
      : api
          .get<{ checkIn: CheckIn | null }>('/checkins/latest')
          .then(({ checkIn: latest }) => (latest?.day === today ? latest : null))

    Promise.all([
      load.catch(() => null),
      api.get<AppConfig>('/config').catch(() => null),
    ]).then(([existing, config]) => {
      setPhotosEnabled(Boolean(config?.photoUploads))
      setCheckIn(existing)
      setMode(existing ? 'view' : 'form')
    })
  }, [editingId])

  // La preview local es un object URL: hay que soltarlo o queda pinchada la memoria.
  useEffect(() => {
    if (!file) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const preview = objectUrl ?? savedPhoto

  /** Pasa el check-in guardado al formulario para poder editarlo. */
  const startEditing = () => {
    if (!checkIn) return
    setComment(checkIn.note ?? '')
    setSavedPhoto(checkIn.photoUrl)
    setFile(null)
    setError(null)
    setMode('form')
  }

  const save = async () => {
    setSubmitting(true)
    setError(null)
    try {
      let photo: { url: string; publicId: string } | null = null
      if (file && photosEnabled) photo = await uploadCheckInPhoto(file, day)

      if (checkIn) {
        const updated = await api.patch<CheckIn>(`/checkins/${checkIn.id}`, {
          note: comment.trim(),
          ...(photo ? { photoUrl: photo.url, photoPublicId: photo.publicId } : {}),
          // Había foto guardada, la quitó y no puso otra.
          ...(!photo && checkIn.photoUrl && !savedPhoto ? { removePhoto: true } : {}),
        })
        setCheckIn(updated)
        setMode('view')
      } else {
        const created = await api.post<CheckIn>('/checkins', {
          day,
          note: comment.trim() || undefined,
          photoUrl: photo?.url,
          photoPublicId: photo?.publicId,
        })
        setCheckIn(created)
        setMode('done')
        setTimeout(() => navigate('/', { replace: true }), 1900)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar el check-in')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async () => {
    if (!checkIn) return
    setSubmitting(true)
    try {
      await api.del(`/checkins/${checkIn.id}`)
      navigate('/', { replace: true })
    } catch {
      setError('No pudimos deshacerlo. Inténtalo de nuevo.')
      setSubmitting(false)
      setConfirmingDelete(false)
    }
  }

  if (mode === 'loading') {
    return (
      <div className="min-h-dvh bg-canvas grid place-items-center">
        <Loader2 size={28} strokeWidth={2.5} className="animate-spin text-accent" />
      </div>
    )
  }

  if (mode === 'done') return <SuccessState checkIn={checkIn} />

  const editing = checkIn !== null
  const isToday = day === localDay()

  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      <div className="mx-auto w-full max-w-[440px] px-5 py-6 flex flex-col flex-1 gap-6">
        <header className="flex items-center gap-2 -ml-2">
          <button
            type="button"
            onClick={() => (mode === 'form' && editing ? setMode('view') : navigate('/'))}
            aria-label="Volver"
            className="pressable grid place-items-center size-11 rounded-[var(--radius-md)] text-ink-300 hover:text-ink-50 hover:bg-ink-850 cursor-pointer"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <div>
            <p className="tape text-text-faint">{formatDay(day)}</p>
            <h1 className="text-headline">
              {mode === 'view' ? (isToday ? 'Ya entrenaste' : 'Tu entrenamiento') : editing ? 'Editar' : 'Marcar entreno'}
            </h1>
          </div>
        </header>

        {mode === 'view' ? (
          <SavedCheckIn
            checkIn={checkIn!}
            isToday={isToday}
            onEdit={startEditing}
            onDelete={() => setConfirmingDelete(true)}
            onBack={() => navigate('/')}
          />
        ) : (
          <>
            {/* --- Foto (opcional) --- */}
            {photosEnabled && (
              <section className="flex flex-col gap-3">
                <CardLabel className="mb-0">Foto · opcional</CardLabel>

                {preview ? (
                  <div className="relative rounded-[var(--radius-lg)] overflow-hidden border border-ink-700">
                    <img
                      src={objectUrl ?? thumbnail(preview, 800)}
                      alt="Vista previa del entreno"
                      className="w-full aspect-square object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null)
                        setSavedPhoto(null)
                      }}
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

            {/* --- Comentario (opcional) --- */}
            <section className="flex flex-col gap-3">
              <CardLabel className="mb-0">Comentario · opcional</CardLabel>
              <TextField
                name="comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Cómo te fue…"
                maxLength={280}
              />
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
                onClick={save}
                disabled={submitting}
                icon={submitting ? <Loader2 size={20} strokeWidth={2.5} className="animate-spin" /> : undefined}
              >
                {submitting
                  ? file
                    ? 'Subiendo foto…'
                    : 'Guardando…'
                  : editing
                    ? 'Guardar cambios'
                    : 'Confirmar entrenamiento'}
              </Button>
              <p className="text-caption text-text-faint text-center mt-3">
                {editing ? 'Puedes cambiarlo las veces que quieras.' : 'No hace falta llenar nada. Un toque y listo.'}
              </p>
            </div>
          </>
        )}
      </div>

      <ConfirmDelete
        open={confirmingDelete}
        isToday={isToday}
        busy={submitting}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={remove}
      />
    </div>
  )
}

/* --- Piezas ------------------------------------------------------------- */

function SavedCheckIn({
  checkIn,
  isToday,
  onEdit,
  onDelete,
  onBack,
}: {
  checkIn: CheckIn
  isToday: boolean
  onEdit: () => void
  onDelete: () => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-5 flex-1">
      <Card tone="accent" notch className="flex items-center gap-4">
        <DayMark state="done" size="lg" animate />
        <div className="min-w-0">
          <p className="text-title leading-tight">{isToday ? 'Ya entrenaste hoy' : 'Entrenamiento marcado'}</p>
          <p className="text-caption text-text-muted">
            {isToday ? 'Uno por día. Regresa mañana.' : 'Puedes editarlo o deshacerlo cuando quieras.'}
          </p>
        </div>
      </Card>

      {checkIn.photoUrl && (
        <img
          src={thumbnail(checkIn.photoUrl, 800)}
          alt="Foto de tu entrenamiento"
          className="w-full aspect-square object-cover rounded-[var(--radius-lg)] border border-ink-700"
        />
      )}

      {checkIn.note && (
        <Card>
          <CardLabel>Lo que anotaste</CardLabel>
          <p className="text-body text-ink-100">{checkIn.note}</p>
        </Card>
      )}

      <div className="mt-auto pb-6 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onEdit} icon={<Pencil size={18} strokeWidth={2.5} />}>
            Editar
          </Button>
          <Button variant="danger" onClick={onDelete} icon={<Trash2 size={18} strokeWidth={2.5} />}>
            Deshacer
          </Button>
        </div>
        <Button size="lg" variant="ghost" fullWidth onClick={onBack}>
          Volver al inicio
        </Button>
      </div>
    </div>
  )
}

/**
 * Deshacer borra el entreno y, con él, los comentarios que le dejaron. Es
 * destructivo, así que se pregunta — pero con dos botones grandes, sin teclado
 * ni escribir "CONFIRMAR".
 */
function ConfirmDelete({
  open,
  isToday,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean
  isToday: boolean
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={<span className="text-title">¿Deshacer el entrenamiento?</span>}>
      <div className="flex flex-col gap-4">
        <p className="text-body text-text-muted">
          {isToday
            ? 'Va a desaparecer de tu día y del feed de tus grupos, junto con los comentarios que te hayan dejado.'
            : 'Va a desaparecer del feed y del calendario, junto con los comentarios que te hayan dejado.'}
        </p>
        <p className="text-caption text-text-faint">Siempre puedes volver a marcarlo.</p>
        <div className="flex flex-col gap-2 pt-1">
          <Button
            size="lg"
            variant="danger"
            fullWidth
            onClick={onConfirm}
            disabled={busy}
            icon={busy ? <Loader2 size={18} strokeWidth={2.5} className="animate-spin" /> : <Trash2 size={18} strokeWidth={2.5} />}
          >
            Sí, deshacer
          </Button>
          <Button size="lg" variant="secondary" fullWidth onClick={onCancel} disabled={busy}>
            Mejor no
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

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

/* --- Texto --------------------------------------------------------------- */

/** "Miércoles 19 de agosto" con la primera en mayúscula. */
function formatDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  const formatted = new Date(year!, month! - 1, date!).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
