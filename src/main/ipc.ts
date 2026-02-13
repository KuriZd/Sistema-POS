// src/main/ipc.ts
import { ipcMain } from 'electron'
import crypto from 'node:crypto'
import { getPrisma } from './prisma'
import { PaymentMethod, SaleStatus } from '@prisma/client'

let currentUserId: number | null = null

function pinHash(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

type CreateProductPayload = {
  sku: string
  barcode?: string | null
  name: string
  price: number
  cost?: number
  taxRateBp?: number
  stock?: number
}

type AddByBarcodePayload = {
  saleId: number
  barcodeOrSku: string
  qty: number
}

type PayPayload = {
  saleId: number
  payments: Array<{
    method: PaymentMethod
    amount: number
    reference?: string | null
  }>
}

type ProductsListQuery = {
  page: number
  pageSize: number
  search?: string
}

type ProductDTO = {
  id: number
  sku: string
  barcode: string | null
  name: string
  price: number
  stock: number | null
}

type ProductsListResult = {
  items: ProductDTO[]
  total: number
  page: number
  pageSize: number
}

function assertInt(n: unknown, field: string): void {
  if (typeof n !== 'number' || !Number.isInteger(n)) throw new Error(`${field} debe ser entero`)
}

function assertNonEmptyString(s: unknown, field: string): void {
  if (typeof s !== 'string' || s.trim().length === 0) throw new Error(`${field} es requerido`)
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function registerIpc(): void {
  const prisma = getPrisma()

  // -------------------------
  // Auth
  // -------------------------
  ipcMain.handle('auth:login', async (_e, pin: string) => {
    assertNonEmptyString(pin, 'PIN')

    const user = await prisma.user.findFirst({
      where: { pinHash: pinHash(pin), active: true }
    })

    if (!user) return { ok: false, error: 'PIN inválido' }
    currentUserId = user.id

    return { ok: true, user: { id: user.id, name: user.name, role: user.role } }
  })

  ipcMain.handle('auth:me', async () => {
    if (!currentUserId) return null
    const user = await prisma.user.findUnique({ where: { id: currentUserId } })
    if (!user) return null
    return { id: user.id, name: user.name, role: user.role }
  })

  ipcMain.handle('auth:logout', async () => {
    currentUserId = null
  })

  // -------------------------
  // Products
  // -------------------------
  ipcMain.handle(
    'products:list',
    async (_e, query?: Partial<ProductsListQuery>): Promise<ProductsListResult> => {
      const rawPage = Number(query?.page ?? 1)
      const rawPageSize = Number(query?.pageSize ?? 20)

      const page = Number.isFinite(rawPage) ? clampInt(Math.trunc(rawPage), 1, 1_000_000) : 1
      const pageSize = Number.isFinite(rawPageSize) ? clampInt(Math.trunc(rawPageSize), 5, 100) : 20
      const skip = (page - 1) * pageSize

      const search = (query?.search ?? '').trim()

      const where =
        search.length > 0
          ? {
              active: true,
              OR: [
                { name: { contains: search } },
                { sku: { contains: search } },
                { barcode: { contains: search } }
              ]
            }
          : { active: true }

      const [total, items] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: { id: 'desc' },
          skip,
          take: pageSize,
          select: {
            id: true,
            sku: true,
            barcode: true,
            name: true,
            price: true,
            stock: true
          }
        })
      ])

      return { items, total, page, pageSize }
    }
  )

  ipcMain.handle('products:create', async (_e, payload: CreateProductPayload) => {
    assertNonEmptyString(payload?.sku, 'sku')
    assertNonEmptyString(payload?.name, 'name')
    assertInt(payload?.price, 'price')

    return prisma.product.create({
      data: {
        sku: payload.sku,
        barcode: payload.barcode ?? null,
        name: payload.name,
        price: payload.price,
        cost: payload.cost ?? 0,
        taxRateBp: payload.taxRateBp ?? 0,
        stock: payload.stock ?? 0
      }
    })
  })

  // -------------------------
  // Sales
  // -------------------------
  ipcMain.handle('sales:create', async () => {
    if (!currentUserId) throw new Error('No auth')

    const folio = `V-${Date.now()}`
    return prisma.sale.create({
      data: {
        folio,
        cashierId: currentUserId,
        subtotal: 0,
        tax: 0,
        total: 0,
        status: SaleStatus.PAID
      }
    })
  })

  ipcMain.handle('sales:addByBarcode', async (_e, args: AddByBarcodePayload) => {
    assertInt(args?.saleId, 'saleId')
    assertNonEmptyString(args?.barcodeOrSku, 'barcodeOrSku')
    assertInt(args?.qty, 'qty')

    const { saleId, barcodeOrSku, qty } = args
    if (qty <= 0) throw new Error('qty debe ser > 0')

    const product = await prisma.product.findFirst({
      where: { active: true, OR: [{ barcode: barcodeOrSku }, { sku: barcodeOrSku }] }
    })
    if (!product) throw new Error('Producto no encontrado')

    const lineTotal = product.price * qty

    await prisma.saleItem.create({
      data: {
        saleId,
        productId: product.id,
        qty,
        price: product.price,
        discount: 0,
        lineTotal
      }
    })

    const items = await prisma.saleItem.findMany({ where: { saleId } })
    const subtotal = items.reduce((a, i) => a + i.lineTotal, 0)
    const tax = 0
    const total = subtotal + tax

    return prisma.sale.update({ where: { id: saleId }, data: { subtotal, tax, total } })
  })

  ipcMain.handle('sales:pay', async (_e, args: PayPayload) => {
    assertInt(args?.saleId, 'saleId')
    if (!Array.isArray(args?.payments) || args.payments.length === 0) {
      throw new Error('payments es requerido')
    }

    const { saleId, payments } = args

    const sale = await prisma.sale.findUnique({ where: { id: saleId } })
    if (!sale) throw new Error('Venta no existe')

    const paid = payments.reduce((a, p) => a + p.amount, 0)
    if (paid !== sale.total) throw new Error('El pago no cuadra con el total')

    await prisma.payment.createMany({
      data: payments.map((p) => ({
        saleId,
        method: p.method,
        amount: p.amount,
        reference: p.reference ?? null
      }))
    })

    return prisma.sale.update({ where: { id: saleId }, data: { status: SaleStatus.PAID } })
  })
}
