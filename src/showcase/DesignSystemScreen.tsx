import { useState } from 'react'
import { ArrowRight, Dumbbell, Plus, Share2, Zap } from 'lucide-react'
import { Button, Card, CardLabel, CardTitle, ChoiceGroup, DayMark, StreakBadge, ThemePicker, cn } from '../components/ui'
import { useTheme } from '../theme/useTheme'
import type { DayState } from '../components/ui/StatusMarks'

/**
 * Pantalla de referencia del sistema de diseño.
 * No es una pantalla de producto: es el muestrario que se mira antes de
 * construir cualquier feature. Si algo no está acá, no existe todavía.
 */

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <span className="tape text-accent">{label}</span>
        <span className="h-px flex-1 bg-line-soft" />
      </div>
      <h2 className="text-headline">{title}</h2>
      {children}
    </section>
  )
}

const WEEK: { day: string; state: DayState }[] = [
  { day: 'L', state: 'done' },
  { day: 'M', state: 'done' },
  { day: 'M', state: 'missed' },
  { day: 'J', state: 'done' },
  { day: 'V', state: 'today' },
  { day: 'S', state: 'idle' },
  { day: 'D', state: 'idle' },
]

export function DesignSystemScreen() {
  const { palette } = useTheme()
  const [frequency, setFrequency] = useState<number | null>(4)
  const [checkedIn, setCheckedIn] = useState(false)

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="app-frame max-w-[480px] flex flex-col gap-12">
        {/* ---------------- Encabezado de marca ---------------- */}
        <header className="flex flex-col gap-3">
          <span className="tape text-text-faint">Sistema de diseño · v1</span>
          <h1 className="text-display [font-variation-settings:'wdth'_120] uppercase">
            Top
            <br />
            Training
          </h1>
          <p className="text-lead text-text-muted">
            Entrenas con tus amigos. O te aguantas ser <span className="text-accent-text font-bold">el más huevón</span> del
            grupo.
          </p>
        </header>

        {/* ---------------- Tema ---------------- */}
        <Section label="01 · Tema" title="Elige tu paleta">
          <p className="text-caption text-text-muted -mt-1">
            Cambia el acento y sus derivados en toda la app. El carbón y la tipografía no se tocan nunca. Activa ahora:{' '}
            <span className="text-accent-text font-bold">{palette.name}</span>.
          </p>
          <ThemePicker />
        </Section>

        {/* ---------------- Tipografía ---------------- */}
        <Section label="02 · Tipografía" title="Archivo Variable">
          <Card className="flex flex-col gap-5">
            <div>
              <CardLabel>Número destacado · .num</CardLabel>
              <div className="flex items-end gap-3">
                <span className="num text-stat-xl text-accent">12</span>
                <span className="num text-stat text-ink-100">86%</span>
              </div>
            </div>
            <div className="h-px bg-line-soft" />
            <div className="flex flex-col gap-2">
              <p className="text-display [font-variation-settings:'wdth'_118]">Display 40</p>
              <p className="text-headline">Headline 28</p>
              <p className="text-title">Title 22</p>
              <p className="text-lead text-ink-200">Lead 18 — la bajada del onboarding.</p>
              <p className="text-body text-ink-200">Body 16 — el texto de cada día.</p>
              <p className="text-caption text-text-muted">Caption 14 — hace 2 horas · Palermo</p>
              <p className="tape text-text-faint">Tape 11 — racha activa</p>
            </div>
          </Card>
        </Section>

        {/* ---------------- Botones ---------------- */}
        <Section label="03 · Acciones" title="Botones">
          <div className="flex flex-col gap-3">
            <Button size="lg" fullWidth icon={<Dumbbell size={20} strokeWidth={2.5} />}>
              Marcar entreno
            </Button>
            <Button variant="secondary" fullWidth iconEnd={<ArrowRight size={20} strokeWidth={2.5} />}>
              Invitar al grupo
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" icon={<Share2 size={18} strokeWidth={2.5} />}>
                Compartir
              </Button>
              <Button variant="danger" size="md">
                Abandonar reto
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" icon={<Plus size={16} strokeWidth={3} />}>
                Amigo
              </Button>
              <Button size="sm" variant="secondary">
                Ver todos
              </Button>
              <Button size="sm" variant="primary" disabled>
                Enviado
              </Button>
            </div>
          </div>
        </Section>

        {/* ---------------- Superficies ---------------- */}
        <Section label="04 · Superficies" title="Cards">
          <div className="flex flex-col gap-3">
            <Card tone="accent" notch>
              <CardLabel>Meta de la semana</CardLabel>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="num text-stat text-accent">4/5</p>
                  <p className="text-caption text-text-muted mt-1">Te falta uno. Faltan 3 días.</p>
                </div>
                <StreakBadge days={12} />
              </div>
            </Card>

            <Card tone="base" interactive>
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-ink-800 grid place-items-center text-ink-300 font-bold">MG</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold leading-tight">Martín G.</p>
                  <p className="text-caption text-text-faint">Piernas · hace 40 min</p>
                </div>
                <StreakBadge days={7} size="sm" />
              </div>
            </Card>

            <Card tone="raised">
              <CardLabel>En riesgo</CardLabel>
              <div className="flex items-center justify-between gap-3">
                <p className="text-body text-ink-200">Lucas no entrena hace 4 días.</p>
                <StreakBadge days={0} state="risk" size="sm" />
              </div>
            </Card>

            <Card tone="outline">
              <p className="text-caption text-text-faint">
                Outline — para bloques vacíos y estados de "todavía no pasó nada".
              </p>
            </Card>
          </div>
        </Section>

        {/* ---------------- Iconografía de estado ---------------- */}
        <Section label="05 · Estados" title="Cumplido, perdido, racha">
          <Card className="flex flex-col gap-5">
            <div>
              <CardLabel>Semana en curso</CardLabel>
              <div className="flex justify-between">
                {WEEK.map(({ day, state }, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <span className="tape text-text-faint">{day}</span>
                    <DayMark state={state} />
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-line-soft" />

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <span className="flex items-center gap-2">
                <DayMark state="done" size="sm" />
                <span className="text-caption text-text-muted">Cumplido</span>
              </span>
              <span className="flex items-center gap-2">
                <DayMark state="missed" size="sm" />
                <span className="text-caption text-text-muted">Perdido</span>
              </span>
              <span className="flex items-center gap-2">
                <DayMark state="idle" size="sm" />
                <span className="text-caption text-text-muted">Sin datos</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <StreakBadge days={23} state="on" />
              <StreakBadge days={2} state="risk" />
              <StreakBadge days={0} state="broken" />
            </div>

            <div className="h-px bg-line-soft" />

            {/* Micro-interacción de referencia: el check-in. */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <DayMark key={String(checkedIn)} state={checkedIn ? 'done' : 'today'} size="lg" animate={checkedIn} />
                <div>
                  <p className="font-bold leading-tight">{checkedIn ? '¡Listo por hoy!' : 'Hoy todavía nada'}</p>
                  <p className="text-caption text-text-faint">Micro-interacción de check-in</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={checkedIn ? 'secondary' : 'primary'}
                onClick={() => setCheckedIn((v) => !v)}
                icon={checkedIn ? undefined : <Zap size={16} strokeWidth={3} />}
              >
                {checkedIn ? 'Deshacer' : 'Check-in'}
              </Button>
            </div>
          </Card>
        </Section>

        {/* ---------------- Sin teclado ---------------- */}
        <Section label="06 · Sin teclado" title="Todo se toca, nada se tipea">
          <p className="text-caption text-text-muted -mt-1">
            Regla del proyecto: si la respuesta es acotada, es un botón. El teclado queda para nombre, peso y texto libre.
          </p>
          <Card>
            <CardTitle>¿Cuántas veces por semana?</CardTitle>
            <p className="text-caption text-text-faint mt-1 mb-4">Sé honesto, luego no llores.</p>
            <ChoiceGroup
              label="Frecuencia semanal"
              columns={4}
              value={frequency}
              onChange={setFrequency}
              options={[
                { value: 2, label: '2', hint: 'tibio' },
                { value: 3, label: '3', hint: 'normal' },
                { value: 4, label: '4', hint: 'en serio' },
                { value: 6, label: '6', hint: 'te rompés' },
              ]}
            />
          </Card>
        </Section>

        {/* ---------------- Neutrales ---------------- */}
        <Section label="07 · Base" title="Carbón, no negro">
          <div className="grid grid-cols-6 gap-1.5">
            {/* Clases literales: Tailwind no puede detectar `bg-${...}` armado en runtime. */}
            {[
              { name: '950', cls: 'bg-ink-950' },
              { name: '900', cls: 'bg-ink-900' },
              { name: '850', cls: 'bg-ink-850' },
              { name: '800', cls: 'bg-ink-800' },
              { name: '700', cls: 'bg-ink-700' },
              { name: '600', cls: 'bg-ink-600' },
              { name: '500', cls: 'bg-ink-500' },
              { name: '400', cls: 'bg-ink-400' },
              { name: '300', cls: 'bg-ink-300' },
              { name: '200', cls: 'bg-ink-200' },
              { name: '100', cls: 'bg-ink-100' },
              { name: '50', cls: 'bg-ink-50' },
            ].map(({ name, cls }) => (
              <div key={name} className="flex flex-col gap-1">
                <div className={cn('h-10 rounded-[var(--radius-xs)] border border-line-soft', cls)} />
                <span className="text-micro text-text-faint text-center">{name}</span>
              </div>
            ))}
          </div>
        </Section>

        <footer className="pt-4 pb-8 text-center">
          <p className="tape text-ink-500">Top Training · sistema de diseño</p>
        </footer>
      </div>
    </div>
  )
}
