import { computePet } from './src/pets.js'

let failures = 0
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(
    `  ${ok ? '✓' : '✗'} ${label}${ok ? '' : `  → esperaba ${JSON.stringify(expected)}, dio ${JSON.stringify(actual)}`}`,
  )
}

// Semana en curso: lun 17 – dom 23 ago 2026. Hoy miércoles 19.
const today = '2026-08-19'
const goal = 4

console.log('\nmascota: vacío y evolución')
check('sin entrenos: triste, nivel 0', computePet([], goal, today), {
  stage: 0,
  mood: 'skip1',
  weeksMet: 0,
  skipDays: 0,
  goal,
})

const weekBefore = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13']
check(
  'una semana cumplida: nivel 1',
  computePet(weekBefore, goal, today).stage,
  1,
)
check(
  'una semana cumplida: weeksMet 1',
  computePet(weekBefore, goal, today).weeksMet,
  1,
)

const fiveWeeks = [
  ...weekBefore,
  '2026-08-03',
  '2026-08-04',
  '2026-08-05',
  '2026-08-06',
  '2026-07-27',
  '2026-07-28',
  '2026-07-29',
  '2026-07-30',
  '2026-07-20',
  '2026-07-21',
  '2026-07-22',
  '2026-07-23',
  '2026-07-13',
  '2026-07-14',
  '2026-07-15',
  '2026-07-16',
]
check('cinco semanas: nivel 5', computePet(fiveWeeks, goal, today).stage, 5)
check('cinco semanas: weeksMet 5', computePet(fiveWeeks, goal, today).weeksMet, 5)

const sixWeeks = [...fiveWeeks, '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09']
check('seis semanas: se queda en 5', computePet(sixWeeks, goal, today).stage, 5)
check('seis semanas: weeksMet 6', computePet(sixWeeks, goal, today).weeksMet, 6)

console.log('\nmascota: ánimo de hoy')
check(
  'sin marcar hoy: triste',
  computePet(['2026-08-18'], goal, today).mood,
  'skip1',
)
check(
  'marcó hoy: vivo',
  computePet(['2026-08-19'], goal, today).mood,
  'ok',
)
check(
  'marcó hoy y ayer: vivo',
  computePet(['2026-08-18', '2026-08-19'], goal, today).mood,
  'ok',
)
check(
  'una semana cumplida, hoy vacío: triste no fallecida',
  computePet(weekBefore, goal, today).mood,
  'skip1',
)
check(
  'ya cumplió esta semana y marcó hoy: vivo',
  computePet(['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-10'], 3, today).mood,
  'ok',
)
check(
  'ya cumplió esta semana, hoy no: triste',
  computePet(['2026-08-17', '2026-08-18'], 2, today).mood,
  'skip1',
)

console.log('\nmascota: no cumplió la meta')
const twoWeeksAgo = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06']
check(
  'entrenó la semana pasada y no llegó: fallecida',
  computePet(['2026-08-10', '2026-08-11'], goal, today).mood,
  'broken',
)
check(
  'entrenó la semana pasada y no llegó: nivel 0',
  computePet(['2026-08-10', '2026-08-11'], goal, today).stage,
  0,
)
check(
  'cumplió una y la siguiente se cayó: fallecida',
  computePet([...twoWeeksAgo, '2026-08-10', '2026-08-11'], goal, today).mood,
  'broken',
)
check(
  'cumplió una y la siguiente se cayó: vuelve a 0',
  computePet([...twoWeeksAgo, '2026-08-10', '2026-08-11'], goal, today).stage,
  0,
)
check(
  'fallecida gana aunque hayas marcado hoy',
  computePet([...twoWeeksAgo, '2026-08-10', '2026-08-11', '2026-08-19'], goal, today).mood,
  'broken',
)
check(
  'usuario nuevo esta semana, sin marcar hoy: triste',
  computePet(['2026-08-17'], goal, today).mood,
  'skip1',
)
check(
  'usuario nuevo esta semana, marcó hoy: vivo',
  computePet(['2026-08-17', '2026-08-19'], goal, today).mood,
  'ok',
)

const revived = [
  ...twoWeeksAgo,
  '2026-08-10',
  '2026-08-11',
  '2026-08-17',
  '2026-08-18',
  '2026-08-19',
  '2026-08-20',
]
check(
  'después de fallar, al cerrar esta semana revive en nivel 1',
  computePet(revived, goal, '2026-08-20').mood,
  'ok',
)
check(
  'después de fallar, al cerrar esta semana el nivel es 1',
  computePet(revived, goal, '2026-08-20').stage,
  1,
)

if (failures) {
  console.log(`\n${failures} fallos`)
  process.exit(1)
}
console.log('\nok')
