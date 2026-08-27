import { useState } from 'react'
import { cn } from '../ui'

/**
 * Carrusel de fotos del check-in. Una sola se ve entera; si hay más, se
 * desliza de costado (el mismo gesto que el de grupos en Home) y un tape
 * dice en cuál estás.
 */
export function PhotoCarousel({
  urls,
  alt,
  onOpen,
  className,
}: {
  urls: string[]
  alt: string
  /** Si está, tocar una foto abre el detalle. */
  onOpen?: () => void
  className?: string
}) {
  const [index, setIndex] = useState(0)
  if (urls.length === 0) return null

  const img = (url: string, i: number) => (
    <img
      src={url}
      alt={i === 0 ? alt : ''}
      loading={i === 0 ? 'eager' : 'lazy'}
      className="w-full aspect-square object-cover"
    />
  )

  const slide = (url: string, i: number) =>
    onOpen ? (
      <button type="button" onClick={onOpen} className="pressable block w-full cursor-pointer">
        {img(url, i)}
      </button>
    ) : (
      img(url, i)
    )

  if (urls.length === 1) {
    return <div className={cn('overflow-hidden', className)}>{slide(urls[0]!, 0)}</div>
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        className="scroll-x snap-x flex"
        onScroll={(event) => {
          const node = event.currentTarget
          const next = Math.round(node.scrollLeft / Math.max(node.clientWidth, 1))
          setIndex(Math.min(urls.length - 1, Math.max(0, next)))
        }}
      >
        {urls.map((url, i) => (
          <div key={`${i}-${url}`} className="snap-start shrink-0 w-full min-w-full">
            {slide(url, i)}
          </div>
        ))}
      </div>
      <p className="tape pointer-events-none absolute top-3 right-3 rounded-[var(--radius-pill)] bg-ink-1000/80 px-2.5 py-1 text-ink-50">
        {index + 1} / {urls.length}
      </p>
    </div>
  )
}
