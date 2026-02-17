// src/main/ipc/products.ipc.ts
import { ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { Prisma } from '@prisma/client'
import { getPrisma } from '../prisma'

export type CreateProductPayload = {
  sku: string
  // Opcional para que coincida con el payload del renderer (que no manda barcode)
  barcode?: string | null
  name: string

  price: number
  cost: number

  profitPctBp: number

  stock: number
  stockMin: number
  stockMax: number

  imageDataUrl: string | null
}

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

function normalizeString(value: unknown): string {
  return String(value ?? '').trim()
}

function toInt(value: unknown, fallback = 0): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.trunc(n)
}

export function registerProductsIpc(): void {
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

    // Si no viene barcode, usamos sku por defecto
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
          imagePath
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
}
