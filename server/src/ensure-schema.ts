import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@libsql/client'

/**
 * Prisma `db push` solo habla SQLite en archivo (`file:`). En Turso
 * (`libsql://`) hay que aplicar el SQL a mano. Si `user` ya existe, no
 * recreamos el schema: los datos se quedan. Tablas nuevas se agregan
 * con CREATE IF NOT EXISTS más abajo.
 */
export async function ensureSchema(): Promise<void> {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db'
  const authToken = process.env.DATABASE_AUTH_TOKEN
  const client = createClient(authToken ? { url, authToken } : { url })

  try {
    const existing = await client.execute(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user'`,
    )
    if (existing.rows.length === 0) {
      const sql = readFileSync(resolve(process.cwd(), 'prisma/init.sql'), 'utf8')
      await client.executeMultiple(sql)
      console.log('[db] schema creada')
    } else {
      console.log(`[db] schema lista (${url.startsWith('libsql:') ? 'Turso' : 'archivo local'})`)
    }

    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS "vote" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "checkInId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "kind" TEXT NOT NULL,
        "day" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "vote_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "checkin" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "vote_checkInId_userId_kind_key" ON "vote"("checkInId", "userId", "kind");
      CREATE INDEX IF NOT EXISTS "vote_checkInId_idx" ON "vote"("checkInId");
      CREATE INDEX IF NOT EXISTS "vote_userId_kind_day_idx" ON "vote"("userId", "kind", "day");
      CREATE UNIQUE INDEX IF NOT EXISTS "vote_flex_user_day" ON "vote"("userId", "day") WHERE "kind" = 'flex';
    `)
  } finally {
    client.close()
  }
}
