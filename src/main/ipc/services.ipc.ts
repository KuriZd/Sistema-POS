// src/main/ipc/services.ipc.ts
import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { getPrisma } from '../prisma'
import { Prisma } from '@prisma/client'

type ServiceSupplyInput = {
  productId: number
  qty: number
}

export type CreateServicePayload = {
  code: string
  name: string

  // Centavos
  price: number
  cost: number

  // % * 100
  profitPctBp: number

  durationMin: number
  taxRateBp?: number
  active?: boolean

  // Insumos (productos consumibles)
  supplies?: ServiceSupplyInput[]
}

type UpdateServicePayload = Partial<CreateServicePayload>

type ListArgs = {
  search?: string
  page?: number
  pageSize?: number

  /**
   * Si viene en true/false, filtra explícitamente.
   * Si no viene, por defecto listamos solo activos (para no mostrar "eliminados").
   */
  active?: boolean
}

function assertInt(n: unknown, field: string): void {
  if (typeof n !== 'number' || !Number.isInteger(n)) throw new Error(`${field} debe ser entero`)
}

function assertNonEmptyString(s: unknown, field: string): void {
  if (typeof s !== 'string' || s.trim().length === 0) throw new Error(`${field} es requerido`)
}

function assertNonNegativeInt(n: unknown, field: string): void {
  assertInt(n, field)
  if ((n as number) < 0) throw new Error(`${field} no puede ser negativo`)
}

function normalizeSearch(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePage(value: unknown, fallback: number): number {
  const n = typeof value === 'number' && Number.isInteger(value) ? value : fallback
  return Math.max(1, n)
}

function normalizePageSize(value: unknown, fallback: number): number {
  const n = typeof value === 'number' && Number.isInteger(value) ? value : fallback
  return Math.min(50, Math.max(1, n))
}

function normalizeSupplies(value: unknown): ServiceSupplyInput[] {
  if (!Array.isArray(value)) return []

  return value
    .map((x) => {
      const productId = typeof x?.productId === 'number' ? x.productId : NaN
      const qty = typeof x?.qty === 'number' ? x.qty : NaN
      return { productId, qty }
    })
    .filter((x) => Number.isInteger(x.productId) && Number.isInteger(x.qty) && x.qty > 0)
}

async function assertSuppliesProductsExist(productIds: number[]): Promise<void> {
  if (productIds.length === 0) return

  const prisma = getPrisma()
  const found = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
    select: { id: true }
  })

  const foundIds = new Set(found.map((p) => p.id))
  const missing = productIds.filter((id) => !foundIds.has(id))

  if (missing.length > 0) {
    throw new Error(`Insumos inválidos o inactivos: ${missing.join(', ')}`)
  }
}

export function registerServicesIpc(): void {
  const prisma = getPrisma()

  // -------------------------
  // Services: list
  // -------------------------
  ipcMain.handle('services:list', async (_e: IpcMainInvokeEvent, args: ListArgs) => {
    const search = normalizeSearch(args?.search)
    const page = normalizePage(args?.page, 1)
    const pageSize = normalizePageSize(args?.pageSize, 10)

    // Por defecto: solo activos
    const active =
      typeof args?.active === 'boolean'
        ? args.active
        : true

    const where = {
      active,
      ...(search.length === 0
        ? {}
        : {
            OR: [{ name: { contains: search } }, { code: { contains: search } }]
          })
    }

    const skip = (page - 1) * pageSize

    const [total, items] = await prisma.$transaction([
      prisma.service.count({ where }),
      prisma.service.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          code: true,
          name: true,
          price: true,
          cost: true,
          profitPctBp: true,
          durationMin: true,
          active: true,
          createdAt: true
        }
      })
    ])

    return { items, total, page, pageSize }
  })

  // -------------------------
  // Services: get
  // -------------------------
  ipcMain.handle('services:get', async (_e: IpcMainInvokeEvent, id: number) => {
    assertInt(id, 'id')

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        supplies: {
          include: {
            product: {
              select: { id: true, name: true, stock: true, cost: true, active: true }
            }
          }
        }
      }
    })

    if (!service) throw new Error('Servicio no encontrado')

    return service
  })

  // -------------------------
  // Services: getByCode (para validar unique en UI)
  // -------------------------
  ipcMain.handle('services:getByCode', async (_e: IpcMainInvokeEvent, code: string) => {
    assertNonEmptyString(code, 'code')

    const service = await prisma.service.findUnique({
      where: { code: code.trim() },
      select: { id: true, code: true, name: true }
    })

    return service ?? null
  })

  // -------------------------
  // Services: create
  // -------------------------
  ipcMain.handle('services:create', async (_e: IpcMainInvokeEvent, payload: CreateServicePayload) => {
    assertNonEmptyString(payload?.code, 'code')
    assertNonEmptyString(payload?.name, 'name')

    assertNonNegativeInt(payload?.price, 'price')
    assertNonNegativeInt(payload?.cost, 'cost')

    assertInt(payload?.profitPctBp, 'profitPctBp')
    assertNonNegativeInt(payload?.durationMin, 'durationMin')

    const supplies = normalizeSupplies(payload?.supplies)
    const productIds = [...new Set(supplies.map((s) => s.productId))]

    await assertSuppliesProductsExist(productIds)

    try {
      return prisma.service.create({
        data: {
          code: payload.code.trim(),
          name: payload.name.trim(),
          price: payload.price,
          cost: payload.cost,
          profitPctBp: payload.profitPctBp,
          durationMin: payload.durationMin,
          taxRateBp: payload.taxRateBp ?? 0,
          active: payload.active ?? true,
          supplies: supplies.length
            ? {
                createMany: {
                  data: supplies.map((s) => ({ productId: s.productId, qty: s.qty }))
                }
              }
            : undefined
        }
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new Error('El código del servicio ya está registrado.')
      }
      throw err
    }
  })

  // -------------------------
  // Services: update (incluye reemplazo de insumos)
  // -------------------------
  ipcMain.handle('services:update', async (_e: IpcMainInvokeEvent, id: number, payload: UpdateServicePayload) => {
    assertInt(id, 'id')

    if (payload.code !== undefined) assertNonEmptyString(payload.code, 'code')
    if (payload.name !== undefined) assertNonEmptyString(payload.name, 'name')

    if (payload.price !== undefined) assertNonNegativeInt(payload.price, 'price')
    if (payload.cost !== undefined) assertNonNegativeInt(payload.cost, 'cost')

    if (payload.profitPctBp !== undefined) assertInt(payload.profitPctBp, 'profitPctBp')
    if (payload.durationMin !== undefined) assertNonNegativeInt(payload.durationMin, 'durationMin')

    const supplies = payload.supplies !== undefined ? normalizeSupplies(payload.supplies) : null
    const productIds = supplies ? [...new Set(supplies.map((s) => s.productId))] : []

    if (supplies) await assertSuppliesProductsExist(productIds)

    // Update + refresh supplies en transacción para que quede consistente
    return prisma.$transaction(async (tx) => {
      const service = await tx.service.findUnique({ where: { id } })
      if (!service) throw new Error('Servicio no encontrado')

      const updated = await tx.service.update({
        where: { id },
        data: {
          code: payload.code?.trim(),
          name: payload.name?.trim(),
          price: payload.price,
          cost: payload.cost,
          profitPctBp: payload.profitPctBp,
          durationMin: payload.durationMin,
          taxRateBp: payload.taxRateBp,
          active: payload.active
        }
      })

      if (supplies) {
        await tx.serviceSupply.deleteMany({ where: { serviceId: id } })

        if (supplies.length > 0) {
          await tx.serviceSupply.createMany({
            data: supplies.map((s) => ({
              serviceId: id,
              productId: s.productId,
              qty: s.qty
            }))
          })
        }
      }

      return updated
    })
  })

  // -------------------------
  // Services: remove (soft delete)
  // -------------------------
  ipcMain.handle('services:remove', async (_e: IpcMainInvokeEvent, id: number) => {
    assertInt(id, 'id')

    // "Eliminar" = desactivar para conservar historial (SaleItem, etc.)
    await prisma.service.update({
      where: { id },
      data: { active: false }
    })

    return { ok: true }
  })
}