import { useEffect, useRef, useState } from 'react'
import { Loader2, PenLine } from 'lucide-react'
import { Button, Sheet } from '../ui'
import { api, localDay } from '../../lib/api'

const MAX_BODY = 280

/**
 * Publicar un texto en el grupo. No es un entreno: no suma racha ni se vota.
 * El teclado solo aparece cuando tocas para escribir.
 */
export function PostComposer({ groupId, onPosted }: { groupId: string; onPosted: () => void }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const field = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => field.current?.focus(), 220)
    return () => window.clearTimeout(id)
  }, [open])

  const close = () => {
    if (sending) return
    setOpen(false)
    setError(null)
  }

  const publish = async () => {
    const text = body.trim()
    if (!text) return
    setSending(true)
    setError(null)
    try {
      await api.post(`/groups/${groupId}/posts`, { body: text, day: localDay() })
      setBody('')
      setOpen(false)
      onPosted()
    } catch {
      setError('No se pudo publicar. Probá de nuevo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable flex items-center gap-3 w-full min-h-[var(--size-touch)] px-4 rounded-[var(--radius-lg)] bg-surface border border-line-soft text-left hover:border-ink-600 cursor-pointer"
      >
        <span className="grid place-items-center size-11 shrink-0 rounded-[var(--radius-md)] bg-ink-850 text-accent">
          <PenLine size={20} strokeWidth={2.5} />
        </span>
        <span className="min-w-0">
          <span className="block font-bold leading-tight">Escribir en el grupo</span>
          <span className="block text-caption text-text-muted">Solo texto. No cuenta como entreno.</span>
        </span>
      </button>

      <Sheet open={open} onClose={close} title={<span className="text-title">Post</span>}>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="tape text-text-faint">Qué quieres decir</span>
            <textarea
              ref={field}
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, MAX_BODY))}
              maxLength={MAX_BODY}
              rows={5}
              placeholder="Suéltalo todo"
              className="w-full min-h-32 px-4 py-3 rounded-[var(--radius-md)] bg-ink-900 border border-ink-700 outline-none text-body placeholder:text-ink-500 focus:border-accent transition-colors resize-none"
            />
            <span className="tape text-text-faint self-end">
              {body.length}/{MAX_BODY}
            </span>
          </label>

          {error && (
            <p className="text-caption text-danger bg-danger-tint border border-danger/30 rounded-[var(--radius-sm)] px-3 py-2">
              {error}
            </p>
          )}

          <Button
            size="lg"
            fullWidth
            onClick={() => void publish()}
            disabled={sending || !body.trim()}
            icon={sending ? <Loader2 size={20} strokeWidth={2.5} className="animate-spin" /> : undefined}
          >
            {sending ? 'Publicando…' : 'Publicar'}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
