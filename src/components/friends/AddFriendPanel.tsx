import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Clock, Copy, Search, UserPlus } from 'lucide-react'
import { Avatar, Button, Card, CardLabel, SegmentedControl, TextField } from '../ui'
import { api, type Friend, type Relation, type SearchResult } from '../../lib/api'

/**
 * Panel de "agregar amigo", compartido por el onboarding y la pantalla de
 * Amigos: las dos formas de sumar gente (código y búsqueda) viven acá y no
 * se duplican.
 *
 * Nada se agrega de una: se manda una solicitud que el otro tiene que aceptar.
 */
export function AddFriendPanel({
  myCode,
  onRequestSent,
}: {
  myCode: string
  /** Para que la pantalla de arriba refresque sus listas. */
  onRequestSent?: (friend: Friend, status: string) => void
}) {
  const [tab, setTab] = useState<'code' | 'search'>('code')

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label="Cómo agregar amigos"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'code', label: 'Con código' },
          { value: 'search', label: 'Por usuario' },
        ]}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-4"
        >
          {tab === 'code' ? (
            <CodeTab myCode={myCode} onRequestSent={onRequestSent} />
          ) : (
            <SearchTab onRequestSent={onRequestSent} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* --- Con código ---------------------------------------------------------- */

function CodeTab({
  myCode,
  onRequestSent,
}: {
  myCode: string
  onRequestSent?: (friend: Friend, status: string) => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(myCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Tu navegador no dejó copiar. Dictalo y listo.')
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFeedback(null)
    setBusy(true)
    try {
      const result = await api.post<{ status: string; user: Friend }>('/friends/request', {
        code: code.trim().toUpperCase(),
      })
      setFeedback(
        result.status === 'accepted'
          ? `¡${result.user.name} ya es tu amigo! Te había mandado solicitud.`
          : `Solicitud enviada a ${result.user.name}. Falta que la acepte.`,
      )
      setCode('')
      onRequestSent?.(result.user, result.status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar la solicitud')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card tone="accent" notch>
        <CardLabel>Tu código</CardLabel>
        <div className="flex items-center justify-between gap-3">
          <span className="num text-stat text-accent tracking-[0.08em]">{myCode}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={copy}
            icon={copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
          >
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <p className="text-caption text-text-muted mt-2">Pasáselo a tus amigos para que te agreguen.</p>
      </Card>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <TextField
          label="Código de tu amigo"
          name="friendCode"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="A1B2C3"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={8}
          error={error}
          className="num tracking-[0.18em] uppercase"
        />
        <Button
          type="submit"
          variant="secondary"
          fullWidth
          disabled={code.length < 4 || busy}
          icon={<UserPlus size={18} strokeWidth={2.5} />}
        >
          Enviar solicitud
        </Button>
        {feedback && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-caption text-success bg-success-tint border border-success/30 rounded-[var(--radius-sm)] px-3 py-2"
          >
            {feedback}
          </motion.p>
        )}
      </form>
    </>
  )
}

/* --- Por usuario --------------------------------------------------------- */

const RELATION_LABEL: Record<Relation, string> = {
  none: 'Agregar',
  pending_out: 'Enviada',
  pending_in: 'Aceptar',
  friends: 'Ya está',
}

function SearchTab({ onRequestSent }: { onRequestSent?: (friend: Friend, status: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      setSearching(true)
      api
        .get<SearchResult[]>(`/users/search?q=${encodeURIComponent(term)}`)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 280)
    return () => clearTimeout(timer)
  }, [query])

  const send = async (user: SearchResult) => {
    const result = await api.post<{ status: string; user: Friend }>('/friends/request', { userId: user.id })
    setResults((current) =>
      current.map((item) =>
        item.id === user.id
          ? { ...item, relation: result.status === 'accepted' ? 'friends' : 'pending_out' }
          : item,
      ),
    )
    onRequestSent?.(result.user, result.status)
  }

  return (
    <>
      <TextField
        label="Buscar por nombre"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Martín, Lucas…"
        autoComplete="off"
        icon={<Search size={18} strokeWidth={2.5} />}
      />

      {query.trim().length >= 2 && results.length === 0 && !searching && (
        <p className="text-caption text-text-faint">Nadie con ese nombre. Probá con el código.</p>
      )}

      <div className="flex flex-col gap-2">
        {results.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] bg-ink-900 border border-ink-700"
          >
            <Avatar name={user.name} image={user.image} size={40} />
            <span className="flex-1 min-w-0">
              <span className="block font-bold truncate">{user.name}</span>
              <span className="block tape text-text-faint">{user.friendCode}</span>
            </span>
            <Button
              size="sm"
              variant={user.relation === 'none' || user.relation === 'pending_in' ? 'primary' : 'ghost'}
              disabled={user.relation === 'pending_out' || user.relation === 'friends'}
              onClick={() => void send(user)}
              icon={user.relation === 'pending_out' ? <Clock size={14} strokeWidth={3} /> : undefined}
            >
              {RELATION_LABEL[user.relation]}
            </Button>
          </div>
        ))}
      </div>
    </>
  )
}
