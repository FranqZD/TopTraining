import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, CardLabel, Sheet, TextField, cn } from '../components/ui'
import { api, type PetMood, type PetSpecies, type PetStage, type PetView } from '../lib/api'
import { Pet, SPECIES, SPECIES_NAMES, type PetHealth } from './Pet'

/**
 * Hueco de la mascota en Inicio. Si no hay una elegida, invita a escoger.
 * El nivel es cuántas metas semanales cerraste (1 a 5).
 *
 * `ready` es false mientras no sabemos si ya adoptó: no se pinta el CTA, para
 * que un recarga no deje “Escoge tu mascota” un instante encima de la real.
 */
export function PetHome({
  pet,
  ready,
  onAdopted,
}: {
  pet?: PetView
  ready: boolean
  onAdopted: (pet: PetView) => void
}) {
  const [open, setOpen] = useState(false)
  const adopted = Boolean(pet?.species && pet.name)
  const level = displayLevel(pet?.stage)
  const health = toHealth(pet?.mood)

  useEffect(() => {
    if (adopted) setOpen(false)
  }, [adopted])

  return (
    <section aria-label="Tu mascota" className="flex-1 min-h-0 flex flex-col gap-2">
      <CardLabel className="mb-0">{adopted ? pet!.name : 'Tu mascota'}</CardLabel>
      <div className="flex-1 min-h-0 rounded-[var(--radius-lg)] bg-surface border border-line-soft overflow-hidden flex flex-col">
        {adopted ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1 px-3 py-2">
            <div className="flex-1 min-h-0 grid place-items-center w-full">
              <Pet
                species={pet!.species!}
                level={level}
                health={health}
                size={140}
                className="max-h-full w-auto"
                title={pet!.name ?? undefined}
              />
            </div>
            <p className={cn('tape shrink-0', moodTone(pet!.mood))}>
              Nivel {level}
              {pet!.goal > 0 ? ` · ${moodLabel(pet!.mood)}` : ''}
            </p>
          </div>
        ) : ready ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pressable flex-1 min-h-0 flex flex-col items-center justify-center gap-3 cursor-pointer px-4"
          >
            <span className="flex items-end justify-center gap-1">
              {SPECIES.map((species) => (
                <Pet key={species} species={species} level={1} health="ok" size={40} paused />
              ))}
            </span>
            <span className="flex items-center gap-1.5 text-accent">
              <Plus size={16} strokeWidth={2.5} />
              <span className="text-body font-bold">Escoge tu mascota</span>
            </span>
          </button>
        ) : (
          <div className="flex-1 min-h-0" aria-hidden />
        )}
      </div>

      <AdoptSheet
        open={open && !adopted}
        onClose={() => setOpen(false)}
        onAdopted={(next) => {
          onAdopted(next)
          setOpen(false)
        }}
      />
    </section>
  )
}

function AdoptSheet({
  open,
  onClose,
  onAdopted,
}: {
  open: boolean
  onClose: () => void
  onAdopted: (pet: PetView) => void
}) {
  const [species, setSpecies] = useState<PetSpecies>('blob')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSpecies('blob')
    setName('')
  }, [open])

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      onAdopted(await api.patch<PetView>('/me/pet', { species, name: trimmed }))
    } catch {
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={<span className="text-title">Escoge tu mascota</span>}>
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="Especie" className="grid grid-cols-5 gap-1.5">
          {SPECIES.map((option) => {
            const selected = option === species
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSpecies(option)}
                className={cn(
                  'pressable flex flex-col items-center gap-1 py-2 rounded-[var(--radius-md)] border cursor-pointer',
                  selected ? 'bg-accent-tint border-accent-line' : 'bg-ink-850 border-ink-700 hover:border-ink-600',
                )}
              >
                <Pet species={option} level={1} health="ok" size={48} paused={!selected} />
                <span className="tape text-micro">{SPECIES_NAMES[option]}</span>
              </button>
            )
          })}
        </div>

        <p className="text-caption text-warning">
          Elige con calma: la mascota y el nombre no se pueden cambiar después.
        </p>

        <TextField
          label="Nombre"
          name="petName"
          value={name}
          onChange={(event) => setName(event.target.value.slice(0, 16))}
          placeholder="Cómo se llama"
          maxLength={16}
          autoComplete="off"
        />

        <Button size="lg" fullWidth disabled={saving || !name.trim()} onClick={() => void submit()}>
          Adoptar
        </Button>
      </div>
    </Sheet>
  )
}

function displayLevel(stage?: PetStage): number {
  return Math.min(5, Math.max(1, stage ?? 0))
}

function toHealth(mood?: PetMood): PetHealth {
  if (mood === 'skip1') return 'day1'
  if (mood === 'skip2') return 'days3'
  if (mood === 'broken') return 'dormant'
  return 'ok'
}

function moodTone(mood: PetMood): string {
  if (mood === 'broken') return 'text-danger'
  if (mood === 'skip1' || mood === 'skip2') return 'text-warning'
  return 'text-success'
}

function moodLabel(mood: PetMood): string {
  if (mood === 'skip1') return 'Un día sin marcar'
  if (mood === 'skip2') return 'Lleva días sin marcar'
  if (mood === 'broken') return 'Se rompió la racha'
  return 'Al día'
}
