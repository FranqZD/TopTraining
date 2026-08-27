/**
 * Soft delete: las lecturas de producto no ven filas con `deletedAt`.
 * `findUnique` no pasa por acá — el caller decide (restaurar vs 404).
 */
export function withAlive<W>(where: W): W {
  if (where && typeof where === 'object' && 'deletedAt' in where) return where
  return { ...(where as object), deletedAt: null } as W
}

export function hiddenAt(at = new Date()) {
  return { deletedAt: at }
}

export function isHidden(row: { deletedAt: Date | null } | null | undefined): boolean {
  return !row || row.deletedAt !== null
}
