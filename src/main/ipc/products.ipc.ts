// src/main/ipc/products.ipc.ts
import { ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { Prisma } from '@prisma/client'
import { getPrisma } from '../prisma'
import { pathToFileURL } from 'url'

export type CreateProductPayload = {
  sku: string
  barcode?: string | null
  name: string

  price: number
  cost?: number
  profitPctBp?: number

  stock?: number
  stockMin?: number
  stockMax?: number

  imageDataUrl?: string | null
}

type ProductsListQuery = {
  page?: number
  pageSize?: number
  search?: string
}

// -----------------------------
// Image helpers
// -----------------------------
function isImageDataUrl(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value)
}

function getImageExtFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/)
  const mime = match?.[1]?.toLowerCase() ?? 'png'
  return mime === 'jpeg' ? 'jpg' : mime
}

async function saveProductImage(dataUrl: string, sku: string): Promise<string> {
  if (!isImageDataUrl(dataUrl)) throw new Error('Formato de imagen inválido')

  const ext = getImageExtFromDataUrl(dataUrl)
  const base64 = dataUrl.split(',')[1] ?? ''
  const buffer = Buffer.from(base64, 'base64')

  const dir = path.join(app.getPath('userData'), 'images', 'products')
  await fs.mkdir(dir, { recursive: true })

  const filename = `${sku}-${Date.now()}.${ext}`
  const filePath = path.join(dir, filename)

  await fs.writeFile(filePath, buffer)
  return filePath
}

// -----------------------------
// Value helpers
// -----------------------------
function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function toInt(value: unknown, fallback = 0): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.trunc(n)
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function registerProductsIpc(): void {
  // Evita crash si este registro se ejecuta más de una vez
  for (const ch of [
    'products:create',
    'products:list',
    'products:remove',
    'products:get',
    'products:update'
  ] as const) {
    ipcMain.removeHandler(ch)
  }

  ipcMain.handle('products:create', async (_event, payload: CreateProductPayload) => {
    const sku = normalizeString(payload?.sku)
    const name = normalizeString(payload?.name)

    if (!sku) throw new Error('SKU requerido')
    if (!name) throw new Error('Nombre requerido')

    const price = toInt(payload?.price, 0)
    const cost = toInt(payload?.cost, 0)

    const stock = toInt(payload?.stock, 0)
    const stockMin = toInt(payload?.stockMin, 0)
    const stockMax = toInt(payload?.stockMax, 0)

    const profitPctBp = toInt(payload?.profitPctBp, 0)

    const barcodeRaw = normalizeString(payload?.barcode)
    const barcode = barcodeRaw ? barcodeRaw : sku

    let imagePath: string | null = null
    if (payload?.imageDataUrl) {
      imagePath = await saveProductImage(payload.imageDataUrl, sku)
    }

    try {
      const product = await getPrisma().product.create({
        data: {
          sku,
          barcode,
          name,
          price,
          cost,
          profitPctBp,
          stock,
          stockMin,
          stockMax,
          imagePath,
          active: true
        }
      })

      return { id: product.id }
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new Error('Ya existe un producto con ese SKU o Barcode')
      }
      throw err
    }
  })

  ipcMain.handle('products:list', async (_event, query: ProductsListQuery) => {
    const page = clampInt(toInt(query?.page, 1), 1, 1_000_000)
    const pageSize = clampInt(toInt(query?.pageSize, 20), 1, 200)
    const search = normalizeString(query?.search)

    const where: Prisma.ProductWhereInput =
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
      getPrisma().product.count({ where }),
      getPrisma().product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
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
  })

  ipcMain.handle('products:remove', async (_event, id: number) => {
    const productId = toInt(id, 0)
    if (productId <= 0) throw new Error('ID inválido')

    await getPrisma().product.delete({ where: { id: productId } })
    return { ok: true }
  })

  ipcMain.handle('products:get', async (_event, id: number) => {
    const productId = toInt(id, 0)
    if (productId <= 0) throw new Error('ID inválido')

    const p = await getPrisma().product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        price: true,
        cost: true,
        profitPctBp: true,
        stock: true,
        stockMin: true,
        stockMax: true,
        imagePath: true,
        active: true
      }
    })

    if (!p) throw new Error('Producto no encontrado')

    const imageUrl = p.imagePath ? pathToFileURL(p.imagePath).toString() : null

    return { ...p, imageUrl }
  })

  ipcMain.handle(
    'products:update',
    async (_event, id: number, payload: Partial<CreateProductPayload>) => {
      const productId = toInt(id, 0)
      if (productId <= 0) throw new Error('ID inválido')

      const data: Prisma.ProductUpdateInput = {}

      const sku = payload?.sku !== undefined ? normalizeString(payload.sku) : undefined
      if (sku !== undefined) {
        if (!sku) throw new Error('SKU requerido')
        data.sku = sku
      }

      const name = payload?.name !== undefined ? normalizeString(payload.name) : undefined
      if (name !== undefined) {
        if (!name) throw new Error('Nombre requerido')
        data.name = name
      }

      if (payload?.barcode !== undefined) {
        const b = normalizeString(payload.barcode)
        data.barcode = b ? b : null
      }

      if (payload?.price !== undefined) data.price = toInt(payload.price, 0)
      if (payload?.cost !== undefined) data.cost = toInt(payload.cost, 0)
      if (payload?.profitPctBp !== undefined) data.profitPctBp = toInt(payload.profitPctBp, 0)

      if (payload?.stock !== undefined) data.stock = toInt(payload.stock, 0)
      if (payload?.stockMin !== undefined) data.stockMin = toInt(payload.stockMin, 0)
      if (payload?.stockMax !== undefined) data.stockMax = toInt(payload.stockMax, 0)

      // Imagen: si viene dataUrl => reemplaza. Si viene null explícito => quita imagen.
      if (payload?.imageDataUrl !== undefined) {
        if (payload.imageDataUrl === null) {
          data.imagePath = null
        } else if (payload.imageDataUrl) {
          const currentSku =
            (data.sku as string) ??
            (
              await getPrisma().product.findUnique({
                where: { id: productId },
                select: { sku: true }
              })
            )?.sku
          if (!currentSku) throw new Error('SKU no disponible para guardar imagen')

          data.imagePath = await saveProductImage(payload.imageDataUrl, currentSku)
        }
      }

      try {
        const updated = await getPrisma().product.update({
          where: { id: productId },
          data,
          select: { id: true }
        })

        return { id: updated.id }
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new Error('Ya existe un producto con ese SKU o Barcode')
        }
        throw err
      }
    }
  )
}
