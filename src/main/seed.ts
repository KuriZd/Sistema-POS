// src/main/seed.ts
// Este archivo se encarga de tareas de inicialización, como crear un usuario Admin si no existe.
import crypto from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { Role } from '@prisma/client'

/**
 * Genera hash del PIN para no almacenar el PIN en texto plano.
 */
function pinHash(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

/**
 * Crea un usuario Admin si todavía no existe.
 * PIN default: 1234
 */
export async function ensureAdmin(prisma: PrismaClient): Promise<void> {
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } })
  if (admin) return

  await prisma.user.create({
    data: {
      name: 'Admin',
      role: Role.ADMIN,
      pinHash: pinHash('1234'),
      active: true
    }
  })
}
