import { cn } from './cn'

/** Iniciales sobre carbón. Si el proveedor social trajo foto, la usamos. */
export function Avatar({
  name,
  image,
  size = 44,
  className,
}: {
  name: string
  image?: string | null
  size?: number
  className?: string
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <span
      className={cn(
        'grid place-items-center shrink-0 rounded-full overflow-hidden',
        'bg-ink-800 border border-ink-700 text-ink-200 font-bold',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {image ? <img src={image} alt="" className="size-full object-cover" /> : initials}
    </span>
  )
}
