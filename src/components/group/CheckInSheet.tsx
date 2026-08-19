import { useEffect, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Avatar, Card, CardLabel, DayMark, Sheet } from '../ui'
import { api, relativeTime, type CheckInDetail } from '../../lib/api'
import { thumbnail } from '../../lib/photo'

/**
 * Vista de un entrenamiento: la foto, lo que escribió y los comentarios.
 * Se abre desde el calendario (día con check-in) y desde el feed.
 *
 * El input de comentario es de los pocos lugares donde el teclado está
 * justificado: no hay forma de escribir una cargada con botones.
 */
export function CheckInSheet({
  checkInId,
  onClose,
  onCommented,
}: {
  checkInId: string | null
  onClose: () => void
  onCommented?: () => void
}) {
  const [detail, setDetail] = useState<CheckInDetail | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!checkInId) {
      setDetail(null)
      return
    }
    setDetail(null)
    setBody('')
    api.get<CheckInDetail>(`/checkins/${checkInId}`).then(setDetail).catch(() => setDetail(null))
  }, [checkInId])

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!checkInId || !body.trim()) return
    setSending(true)
    try {
      const comment = await api.post<CheckInDetail['comments'][number]>(`/checkins/${checkInId}/comments`, {
        body: body.trim(),
      })
      setDetail((current) => (current ? { ...current, comments: [...current.comments, comment] } : current))
      setBody('')
      onCommented?.()
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet
      open={checkInId !== null}
      onClose={onClose}
      title={
        detail && (
          <span className="flex items-center gap-2.5">
            <Avatar name={detail.user.name} image={detail.user.image} size={36} />
            <span className="min-w-0">
              <span className="block font-bold truncate leading-tight">{detail.user.name}</span>
              <span className="block tape text-text-faint">{relativeTime(detail.createdAt)}</span>
            </span>
          </span>
        )
      }
    >
      {!detail ? (
        <div className="grid place-items-center py-16">
          <Loader2 size={24} strokeWidth={2.5} className="animate-spin text-accent" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {detail.photoUrl && (
            <img
              src={thumbnail(detail.photoUrl, 800)}
              alt={`Entrenamiento de ${detail.user.name}`}
              className="w-full aspect-square object-cover rounded-[var(--radius-lg)] border border-ink-700"
            />
          )}

          {detail.note ? (
            <p className="text-body text-ink-100">{detail.note}</p>
          ) : (
            !detail.photoUrl && (
              <Card tone="outline" className="flex items-center gap-3">
                <DayMark state="done" size="md" />
                <p className="text-caption text-text-muted">Marcó que entrenó. Sin foto ni descripción.</p>
              </Card>
            )
          )}

          {/* --- Comentarios --- */}
          <div className="flex flex-col gap-3 pt-2">
            <CardLabel className="mb-0">
              Comentarios {detail.comments.length > 0 && `(${detail.comments.length})`}
            </CardLabel>

            {detail.comments.length === 0 ? (
              <p className="text-caption text-text-faint">Todavía nadie dijo nada. Es tu momento.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {detail.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    <Avatar name={comment.user.name} image={comment.user.image} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2">
                        <span className="font-bold text-caption">{comment.user.name}</span>
                        <span className="tape text-text-faint">{relativeTime(comment.createdAt)}</span>
                      </p>
                      <p className="text-body text-ink-200 break-words">{comment.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={send} className="flex items-center gap-2 pt-1">
              <input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Escribí algo…"
                maxLength={280}
                aria-label="Nuevo comentario"
                className="flex-1 min-w-0 h-[var(--size-control)] px-4 rounded-[var(--radius-md)] bg-ink-900 border border-ink-700 outline-none text-body placeholder:text-ink-500 focus:border-accent transition-colors"
              />
              <button
                type="submit"
                disabled={!body.trim() || sending}
                aria-label="Enviar comentario"
                className="pressable grid place-items-center size-[var(--size-control)] shrink-0 rounded-[var(--radius-md)] bg-accent text-on-accent cursor-pointer disabled:bg-ink-800 disabled:text-ink-500 disabled:pointer-events-none"
              >
                {sending ? (
                  <Loader2 size={20} strokeWidth={2.5} className="animate-spin" />
                ) : (
                  <Send size={20} strokeWidth={2.5} />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </Sheet>
  )
}
