//src/main/db.ts
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | null = null

function toSqliteUrl(absPath: string): string {
  return `file:${absPath.replace(/\\/g, '/')}`
}

export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'pos.db')
}

export function getPrisma(): PrismaClient {
  if (prisma) return prisma

  const dbPath = getDbPath()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '')

  process.env.DATABASE_URL = toSqliteUrl(dbPath)
  prisma = new PrismaClient()

  return prisma
}
