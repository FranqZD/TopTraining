import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Avatar, Button, Card, CardLabel, CheckRow, ChoiceGroup, TextField } from '../../components/ui'
import { api, type BaseGoal, type Friend, type Group } from '../../lib/api'

/**
 * Crear grupo: nombre, meta base y a quién me llevo puesto.
 * Solo el nombre usa teclado; la meta y los invitados son todo a dedo.
 */
export function CreateGroupScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [baseGoal, setBaseGoal] = useState<BaseGoal | null>(4)
  const [friends, setFriends] = useState<Friend[]>([])
  const [invited, setInvited] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<Friend[]>('/friends').then(setFriends).catch(() => setFriends([]))
  }, [])

  const toggle = (id: string) =>
    setInvited((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const create = async () => {
    if (!baseGoal) return
    setBusy(true)
    setError(null)
    try {
      const group = await api.post<Group>('/groups', {
        name: name.trim(),
        baseGoal,
        friendIds: [...invited],
      })
      navigate(`/groups/${group.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear el grupo')
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
          <h1 className="text-headline">Nuevo grupo</h1>
        </header>

        <TextField
          label="Nombre del grupo"
          name="groupName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Cancún o muerte"
          maxLength={40}
          autoFocus
          hint="El que verán todos los miembros."
        />

        <section className="flex flex-col gap-3">
          <CardLabel className="mb-0">Meta base del grupo</CardLabel>
          <ChoiceGroup<BaseGoal>
            label="Meta base del grupo"
            columns={3}
            value={baseGoal}
            onChange={setBaseGoal}
            options={[
              { value: 3, label: <span className="num text-title">3×</span>, hint: 'por semana' },
              { value: 4, label: <span className="num text-title">4×</span>, hint: 'por semana' },
              { value: 5, label: <span className="num text-title">5×</span>, hint: 'por semana' },
            ]}
          />
          <p className="text-caption text-text-faint">
            Cada quien puede ponerse su propia meta después, si quiere más (o menos) exigencia.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <CardLabel className="mb-0">
            Invitar amigos {invited.size > 0 && <span className="text-accent">({invited.size})</span>}
          </CardLabel>
          {friends.length === 0 ? (
            <Card tone="outline">
              <p className="text-caption text-text-muted">
                Todavía no tienes amigos aceptados. Puedes crear el grupo de todos modos y pasarles el código después.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {friends.map((friend) => (
                <CheckRow
                  key={friend.id}
                  checked={invited.has(friend.id)}
                  onToggle={() => toggle(friend.id)}
                  leading={<Avatar name={friend.name} image={friend.image} size={40} />}
                  title={friend.name}
                  subtitle={friend.friendCode}
                />
              ))}
            </div>
          )}
        </section>

        {error && (
          <p className="text-caption text-danger bg-danger-tint border border-danger/30 rounded-[var(--radius-sm)] px-3 py-2">
            {error}
          </p>
        )}

        <div className="pb-10">
          <Button size="lg" fullWidth disabled={name.trim().length < 2 || !baseGoal || busy} onClick={create}>
            Crear grupo
          </Button>
        </div>
      </div>
    </div>
  )
}
