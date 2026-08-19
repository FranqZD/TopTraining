import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // Fallback para `prisma generate` en CI (Render no tiene .env).
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  },
})
