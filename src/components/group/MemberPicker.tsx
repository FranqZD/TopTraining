import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Avatar, Sheet, cn } from '../ui'
import type { GroupMemberView } from '../../lib/api'

/**
 * Selector de miembro del calendario. Es un desplegable, pero abre una hoja
 * con filas grandes en vez de una lista diminuta: se elige con el pulgar.
 */
export function MemberPicker({
  members,
  value,
  onChange,
}: {
  members: GroupMemberView[]
  value: string
  onChange: (userId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = members.find((member) => member.id === value)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="pressable flex items-center gap-3 w-full min-h-[var(--size-control)] px-3.5 rounded-[var(--radius-md)] bg-ink-850 border border-ink-700 hover:border-ink-600 cursor-pointer"
      >
        {selected && <Avatar name={selected.name} image={selected.image} size={32} />}
        <span className="flex-1 min-w-0 text-left">
          <span className="block tape text-text-faint">Viendo a</span>
          <span className="block font-bold truncate leading-tight">{selected?.name ?? 'Elegir'}</span>
        </span>
        <ChevronDown size={20} strokeWidth={2.5} className="text-ink-400 shrink-0" />
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={<span className="text-title">Ver el calendario de</span>}
      >
        <div className="flex flex-col gap-2">
          {members.map((member) => {
            const active = member.id === value
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  onChange(member.id)
                  setOpen(false)
                }}
                className={cn(
                  'pressable flex items-center gap-3 min-h-[var(--size-control-lg)] px-3.5 py-2.5 text-left cursor-pointer',
                  'rounded-[var(--radius-md)] border transition-colors',
                  active ? 'bg-accent-tint border-accent' : 'bg-ink-900 border-ink-700 hover:border-ink-600',
                )}
              >
                <Avatar name={member.name} image={member.image} size={40} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="font-bold truncate leading-tight">{member.name}</span>
                    {member.isMe && <span className="tape text-accent">tú</span>}
                  </span>
                  <span className="block tape text-text-faint">
                    meta {member.effectiveGoal}× · {member.personalGoal === null ? 'del grupo' : 'propia'}
                  </span>
                </span>
                {active && (
                  <span className="grid place-items-center size-6 rounded-full bg-accent text-on-accent shrink-0">
                    <Check size={14} strokeWidth={3.5} absoluteStrokeWidth />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Sheet>
    </>
  )
}
