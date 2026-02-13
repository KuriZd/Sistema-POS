import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { is } from '@electron-toolkit/utils'

let prisma: PrismaClient | null = null

function toFileUrl(absPath: string): string {
  return `file:${absPath.replace(/\\/g, '/')}`
}

function resolveDbUrl(): string {
  if (is.dev) {
    const envUrl = process.env.DATABASE_URL
    if (!envUrl) throw new Error('DATABASE_URL no está definido en .env')

    const raw = envUrl.replace(/^file:/, '')
    const abs = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
    fs.mkdirSync(path.dirname(abs), { recursive: true })

    const url = toFileUrl(abs)
    console.log('[DB] Prisma URL:', url)
    return url
  }

  const prodDb = path.join(app.getPath('userData'), 'pos.db')
  fs.mkdirSync(path.dirname(prodDb), { recursive: true })
  const url = toFileUrl(prodDb)
  console.log('[DB] Prisma URL:', url)
  return url
}

export function getPrisma(): PrismaClient {
  if (prisma) return prisma

  const adapter = new PrismaBetterSqlite3({ url: resolveDbUrl() })

  // Prisma 7: debe ser con adapter (o accelerateUrl)
  prisma = new PrismaClient({ adapter })

  return prisma
}
