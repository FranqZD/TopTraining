import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, LogIn } from 'lucide-react'
import { Button, Card, TextField } from '../../components/ui'
import { api, type Group } from '../../lib/api'

/** Unirse a un grupo con el código que te pasaron. */
export function JoinGroupScreen() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const join = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const group = await api.post<Group>('/groups/join', { code: code.trim().toUpperCase() })
      navigate(`/groups/${group.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos sumarte')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="app-frame max-w-[440px] flex flex-col gap-7">
        <header className="flex items-center gap-2 -ml-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Volver"
            className="pressable grid place-items-center size-11 rounded-[var(--radius-md)] text-ink-300 hover:text-ink-50 hover:bg-ink-850 cursor-pointer"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <h1 className="text-headline">Unirme a un grupo</h1>
        </header>

        <Card tone="outline">
          <p className="text-caption text-text-muted">
            Pídele el código a alguien que ya esté dentro. Son 6 caracteres y no distingue mayúsculas.
          </p>
        </Card>

        <form onSubmit={join} className="flex flex-col gap-4">
          <TextField
            label="Código del grupo"
            name="groupCode"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="A1B2C3"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={8}
            autoFocus
            error={error}
            className="num tracking-[0.18em] uppercase"
          />
          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={code.trim().length < 4 || busy}
            icon={<LogIn size={20} strokeWidth={2.5} />}
          >
            Entrar al grupo
          </Button>
        </form>
      </div>
    </div>
  )
}
