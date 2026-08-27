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
check('sin entrenos: huevo al día', computePet([], goal, today), {
  stage: 0,
  mood: 'ok',
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

console.log('\nmascota: ánimo')
check(
  'entrenó ayer: al día',
  computePet(['2026-08-18'], goal, today).mood,
  'ok',
)
check(
  'sin meta cerrada, un hueco no pone skip',
  computePet(['2026-08-17'], goal, today).mood,
  'ok',
)
check(
  'un día: skipDays 1',
  computePet(['2026-08-17'], goal, today).skipDays,
  1,
)
check(
  'dos días sin marcar (ya había cumplido una semana)',
  computePet([...weekBefore, '2026-08-16'], goal, today).mood,
  'skip2',
)
check(
  'dos días: skipDays 2',
  computePet([...weekBefore, '2026-08-16'], goal, today).skipDays,
  2,
)

check(
  'ya cumplió esta semana: el descanso no pone skip',
  computePet(['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-10'], 3, today).mood,
  'ok',
)

check(
  'semana pasada cumplida, esta va vacía 2 días: skip2 no broken',
  computePet(weekBefore, goal, today).mood,
  'skip2',
)

const twoWeeksAgo = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06']
check(
  'sin ninguna meta cerrada: primer estado, no rota',
  computePet(['2026-08-10', '2026-08-11'], goal, today).mood,
  'ok',
)
check(
  'cumplió una y la siguiente se cayó: broken',
  computePet([...twoWeeksAgo, '2026-08-10', '2026-08-11'], goal, today).mood,
  'broken',
)
check(
  'broken gana aunque hayas marcado hoy',
  computePet([...twoWeeksAgo, '2026-08-10', '2026-08-11', '2026-08-19'], goal, today).mood,
  'broken',
)
check(
  'usuario nuevo esta semana: primer estado',
  computePet(['2026-08-17'], goal, today).mood,
  'ok',
)

if (failures) {
  console.log(`\n${failures} fallos`)
  process.exit(1)
}
console.log('\nok')
