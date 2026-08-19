import 'dotenv/config'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from './generated/prisma/client.js'

/**
 * libSQL (SQLite compatible). En local/Render: file:./dev.db.
 * En Turso: libsql://… + DATABASE_AUTH_TOKEN. Sin better-sqlite3 nativo.
 */
const url = process.env.DATABASE_URL ?? 'file:./dev.db'
const authToken = process.env.DATABASE_AUTH_TOKEN
const adapter = new PrismaLibSql(authToken ? { url, authToken } : { url })

export const prisma = new PrismaClient({ adapter })
