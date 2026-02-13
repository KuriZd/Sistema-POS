export {}

import type { PaymentMethod, Role } from '@prisma/client'

/* -----------------------------
 * Tipos base (sin any)
 * ----------------------------- */
type AuthUser = {
  id: number
  name: string
  role: Role
}

type AuthLoginResult = { ok: true; user: AuthUser } | { ok: false; error: string }

type ProductDTO = {
  id: number
  sku: string
  barcode: string | null
  name: string
  price: number
  cost: number
  taxRateBp: number
  stock: number
  active: boolean
  createdAt: string | Date
  categoryId?: number | null
}

type CreateProductPayload = {
  sku: string
  barcode?: string | null
  name: string
  price: number
  cost?: number
  taxRateBp?: number
  stock?: number
  categoryId?: number | null
}

type SaleDTO = {
  id: number
  folio: string
  subtotal: number
  tax: number
  total: number
  status: 'PAID' | 'CANCELED' | 'REFUNDED' // si luego agregas OPEN, aquí lo incluyes
  cashierId: number
  createdAt: string | Date
}

type PayItem = {
  method: PaymentMethod
  amount: number
  reference?: string | null
}

/* -----------------------------
 * API expuesta por preload
 * ----------------------------- */
declare global {
  interface Window {
    pos: {
      auth: {
        login(pin: string): Promise<AuthLoginResult>
        me(): Promise<AuthUser | null>
        logout(): Promise<void>
      }
      products: {
        list(): Promise<ProductDTO[]>
        create(payload: CreateProductPayload): Promise<ProductDTO>
      }
      sales: {
        create(): Promise<SaleDTO>
        addByBarcode(saleId: number, barcodeOrSku: string, qty: number): Promise<SaleDTO>
        pay(saleId: number, payments: PayItem[]): Promise<SaleDTO>
      }
    }
  }
}
