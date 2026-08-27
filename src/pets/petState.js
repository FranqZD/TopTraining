/**
 * petState.js — única fuente de verdad del estado de la mascota.
 * JS puro sin imports: se usa igual desde el front (Vite/React) y desde Express.
 */

export const MAX_LEVEL = 5;
const DAY = 86400000;

/** Días completos transcurridos desde el último check-in. */
export function daysSince(lastCheckIn, now = Date.now()) {
  if (!lastCheckIn) return 0;
  const t = new Date(lastCheckIn).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / DAY));
}

/**
 * @param {{objectivesCompleted?:number, lastCheckIn?:string|number|Date, now?:number}} p
 * @returns {{level:number, health:'ok'|'day1'|'days3'|'dormant', days:number}}
 */
export function petState({ objectivesCompleted = 0, lastCheckIn, now = Date.now() }) {
  const level = Math.min(Math.max(Math.floor(objectivesCompleted), 1), MAX_LEVEL);
  const days = daysSince(lastCheckIn, now);
  const health = days >= 7 ? 'dormant' : days >= 2 ? 'days3' : days >= 1 ? 'day1' : 'ok';
  return { level, health, days };
}

/** El nivel nunca baja: úsalo al guardar progreso. */
export function bumpLevel(currentLevel, objectivesCompleted) {
  return Math.min(MAX_LEVEL, Math.max(currentLevel || 1, Math.floor(objectivesCompleted) || 1));
}
