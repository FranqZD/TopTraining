import 'dotenv/config'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from './generated/prisma/client.js'
import { withAlive } from './soft-delete.js'

/**
 * libSQL (SQLite compatible). En local/Render: file:./dev.db.
 * En Turso: libsql://… + DATABASE_AUTH_TOKEN. Sin better-sqlite3 nativo.
 */
const url = process.env.DATABASE_URL ?? 'file:./dev.db'
const authToken = process.env.DATABASE_AUTH_TOKEN
const adapter = new PrismaLibSql(authToken ? { url, authToken } : { url })

const base = new PrismaClient({ adapter })

/** findMany / findFirst / count de contenido ignoran lo oculto. */
export const prisma = base.$extends({
  query: {
    checkIn: {
      findMany({ args, query }) {
        args.where = withAlive(args.where)
        return query(args)
      },
      findFirst({ args, query }) {
        args.where = withAlive(args.where)
        return query(args)
      },
      count({ args, query }) {
        args.where = withAlive(args.where)
        return query(args)
      },
    },
    comment: {
      findMany({ args, query }) {
        args.where = withAlive(args.where)
        return query(args)
      },
      findFirst({ args, query }) {
        args.where = withAlive(args.where)
        return query(args)
      },
    },
    groupPost: {
      findMany({ args, query }) {
        args.where = withAlive(args.where)
        return query(args)
      },
      findFirst({ args, query }) {
        args.where = withAlive(args.where)
        return query(args)
      },
    },
  },
})

