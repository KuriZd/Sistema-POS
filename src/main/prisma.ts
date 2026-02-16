// src/main/prisma.ts
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { is } from '@electron-toolkit/utils'

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | null | undefined
  // eslint-disable-next-line no-var
  var __prismaHooked__: boolean | undefined
}

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

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: resolveDbUrl() })

  const log: Prisma.LogDefinition[] = is.dev
    ? [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' }
      ]
    : []

  const client = new PrismaClient({ adapter, log })

  if (is.dev) {
    client.$on('error', (e) => console.error('[Prisma:error]', e))
    client.$on('warn', (e) => console.warn('[Prisma:warn]', e))
  }

  return client
}

export function getPrisma(): PrismaClient {
  if (global.__prisma__) return global.__prisma__

  global.__prisma__ = createPrismaClient()

  if (!global.__prismaHooked__) {
    global.__prismaHooked__ = true

    app.on('before-quit', async () => {
      try {
        await global.__prisma__?.$disconnect()
        global.__prisma__ = null
      } catch (err) {
        console.error('[DB] Error al desconectar Prisma:', err)
      }
    })
  }

  return global.__prisma__
}
