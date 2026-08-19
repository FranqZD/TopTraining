import { localNow, shouldNudge } from './src/scheduler.js'

let failures = 0
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `  → esperaba ${JSON.stringify(expected)}, dio ${JSON.stringify(actual)}`}`)
}

// 2026-08-19T13:00Z = 10:00 en Buenos Aires (UTC-3), 06:00 en México, 15:00 en Madrid.
const at = new Date('2026-08-19T13:00:00Z')

console.log('\nhora local por zona horaria')
check('Buenos Aires', localNow('America/Argentina/Buenos_Aires', at), { day: '2026-08-19', minutes: 600 })
check('Madrid',       localNow('Europe/Madrid', at),                  { day: '2026-08-19', minutes: 900 })
check('Ciudad de México', localNow('America/Mexico_City', at),        { day: '2026-08-19', minutes: 420 })
check('Tokio (ya es el día siguiente)', localNow('Asia/Tokyo', at),   { day: '2026-08-19', minutes: 1320 })
check('zona inválida no rompe', localNow('Marte/Olympus', at), null)

// Medianoche en Buenos Aires: el día tiene que ser el nuevo y la hora 0.
check('medianoche da 00:00 y no 24:00',
  localNow('America/Argentina/Buenos_Aires', new Date('2026-08-20T03:00:00Z')),
  { day: '2026-08-20', minutes: 0 })

console.log('\nventanas de aviso')
const at10 = { day: '2026-08-19', minutes: 10 * 60 }
const at9 = { day: '2026-08-19', minutes: 9 * 60 + 59 }
const at17 = { day: '2026-08-19', minutes: 17 * 60 }
const at2030 = { day: '2026-08-19', minutes: 20 * 60 + 30 }
const at2029 = { day: '2026-08-19', minutes: 20 * 60 + 29 }
const at2330 = { day: '2026-08-19', minutes: 23 * 60 + 30 }

check('mañana: 09:59 todavía no', shouldNudge('morning', at9), false)
check('mañana: 10:00 sí',         shouldNudge('morning', at10), true)
check('mañana: sigue vigente a la tarde', shouldNudge('morning', at17), true)
check('tarde: a las 10 todavía no', shouldNudge('afternoon', at10), false)
check('tarde: 17:00 sí',            shouldNudge('afternoon', at17), true)
check('noche: 20:29 todavía no',    shouldNudge('night', at2029), false)
check('noche: 20:30 sí',            shouldNudge('night', at2030), true)
check('después de las 23 ya no molestamos', shouldNudge('night', at2330), false)
check('horario desconocido no dispara', shouldNudge('inventado', at2030), false)

console.log(failures ? `\n${failures} fallo(s)` : '\nTodo OK')
process.exit(failures ? 1 : 0)
