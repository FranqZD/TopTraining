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
      CREATE INDEX IF NOT EXISTS "vote_userId_kind_idx" ON "vote"("userId", "kind");
    `)

    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS "group_post" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "groupId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "day" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "group_post_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "group_post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "group_post_groupId_day_createdAt_idx" ON "group_post"("groupId", "day", "createdAt");
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
      ['petSpecies', 'TEXT'],
      ['petName', 'TEXT'],
    ])

    await addMissingColumns(client, 'checkin', [['photos', 'TEXT']])

    // El cupo pasó a ser por entrenos, no uno por día: el índice único
    // (userId, day, kind) hay que sacarlo o no se pueden dar varios el mismo día.
    await client.execute(`DROP INDEX IF EXISTS "vote_userId_day_kind_key"`)
    await client.execute(
      `CREATE INDEX IF NOT EXISTS "vote_userId_kind_idx" ON "vote"("userId", "kind")`,
    )
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
