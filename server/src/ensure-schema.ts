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
    `)

    // Interruptores de avisos: columnas nuevas sobre una tabla que ya tiene
    // gente adentro. Todas arrancan prendidas, así nadie deja de recibir lo
    // que venía recibiendo.
    await addMissingColumns(client, 'user', [
      ['notifyNudge', 'BOOLEAN NOT NULL DEFAULT true'],
      ['notifyPosts', 'BOOLEAN NOT NULL DEFAULT true'],
      ['notifyComments', 'BOOLEAN NOT NULL DEFAULT true'],
      ['notifyVotes', 'BOOLEAN NOT NULL DEFAULT true'],
      ['notifyFriends', 'BOOLEAN NOT NULL DEFAULT true'],
    ])

    // El voto pasó a estar racionado: uno de cada tipo por día. Los votos
    // viejos pueden violar el índice nuevo, así que hay que limpiarlos —una
    // sola vez— antes de crearlo.
    const rationed = await client.execute(
      `SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'vote_userId_day_kind_key'`,
    )
    if (rationed.rows.length === 0) {
      await client.executeMultiple(`
        DROP INDEX IF EXISTS "vote_flex_user_day";
        DROP INDEX IF EXISTS "vote_userId_kind_day_idx";
        DELETE FROM "vote" WHERE "kind" = 'flex';
        DELETE FROM "vote"
          WHERE "rowid" NOT IN (SELECT MAX("rowid") FROM "vote" GROUP BY "userId", "day", "kind");
        CREATE UNIQUE INDEX "vote_userId_day_kind_key" ON "vote"("userId", "day", "kind");
      `)
      console.log('[db] votos racionados: uno de cada tipo por día')
    }
  } finally {
    client.close()
  }
}

/**
 * `ALTER TABLE ADD COLUMN` de las que falten. SQLite no tiene `IF NOT EXISTS`
 * para columnas, así que primero se pregunta qué hay.
 */
async function addMissingColumns(
  client: ReturnType<typeof createClient>,
  table: string,
  columns: [name: string, definition: string][],
): Promise<void> {
  const info = await client.execute(`PRAGMA table_info("${table}")`)
  const existing = new Set(info.rows.map((row) => String(row.name)))

  for (const [name, definition] of columns) {
    if (existing.has(name)) continue
    await client.execute(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${definition}`)
    console.log(`[db] columna ${table}.${name} agregada`)
  }
}
