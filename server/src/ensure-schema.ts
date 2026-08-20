import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@libsql/client'

/**
 * Prisma `db push` solo habla SQLite en archivo (`file:`). En Turso
 * (`libsql://`) hay que aplicar el SQL a mano. Si `user` ya existe, no
 * tocamos nada: los datos de Turso se quedan.
 */
export async function ensureSchema(): Promise<void> {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db'
  const authToken = process.env.DATABASE_AUTH_TOKEN
  const client = createClient(authToken ? { url, authToken } : { url })

  try {
    const existing = await client.execute(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user'`,
    )
    if (existing.rows.length > 0) {
      console.log(`[db] schema lista (${url.startsWith('libsql:') ? 'Turso' : 'archivo local'})`)
      return
    }

    const sql = readFileSync(resolve(process.cwd(), 'prisma/init.sql'), 'utf8')
    await client.executeMultiple(sql)
    console.log('[db] schema creada')
  } finally {
    client.close()
  }
}
