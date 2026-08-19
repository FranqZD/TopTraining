/**
 * Genera los íconos de la PWA sin dependencias: escribe el PNG a mano
 * (zlib + CRC32 ya vienen en Node).
 *
 * El ícono es la marca: fondo coral a sangre, "T" casi negra y la esquina
 * cortada en diagonal — el mismo detalle técnico que usan las cards.
 *
 * Correr con: node scripts/generate-icons.mjs
 */
import { deflateSync, crc32 } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const ACCENT = [0xff, 0x4e, 0x33] // --color-accent de la paleta ember
const INK = [0x18, 0x05, 0x02] // --color-on-accent
const CARBON = [0x0a, 0x0a, 0x0b] // --color-canvas

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, checksum])
}

function encodePng(size, pixelAt) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  let offset = 0
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0 // filtro "none"
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelAt(x, y)
      raw[offset++] = r
      raw[offset++] = g
      raw[offset++] = b
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bits por canal
  header[9] = 2 // color RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * @param inset margen relativo del dibujo (los íconos "maskable" necesitan
 *   que el contenido viva dentro del 80% central por si lo recortan redondo).
 */
function icon(size, { inset = 0 } = {}) {
  const pad = size * inset
  const box = size - pad * 2

  // "T": barra superior y tronco, en proporciones de la tipografía Expanded.
  const barTop = pad + box * 0.26
  const barHeight = box * 0.15
  const barLeft = pad + box * 0.16
  const barRight = pad + box * 0.84
  const stemWidth = box * 0.17
  const stemLeft = pad + box * 0.5 - stemWidth / 2
  const stemBottom = pad + box * 0.76

  // Esquina cortada: la firma de marca.
  const notch = size * 0.26

  return (x, y) => {
    if (x + y > size * 2 - notch) return CARBON
    const inBar = y >= barTop && y < barTop + barHeight && x >= barLeft && x < barRight
    const inStem = y >= barTop && y < stemBottom && x >= stemLeft && x < stemLeft + stemWidth
    return inBar || inStem ? INK : ACCENT
  }
}

const targets = [
  ['public/icon-192.png', 192, {}],
  ['public/icon-512.png', 512, {}],
  ['public/icon-maskable-512.png', 512, { inset: 0.12 }],
  ['public/apple-touch-icon.png', 180, { inset: 0.06 }],
]

for (const [path, size, options] of targets) {
  writeFileSync(path, encodePng(size, icon(size, options)))
  console.log(`  ${path} (${size}×${size})`)
}
