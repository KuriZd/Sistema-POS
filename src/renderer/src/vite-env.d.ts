// src/renderer/src/vite-env.d.ts
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

type ProductsListQuery = {
  page: number
  pageSize: number
  search?: string
}

type ProductsListResult = {
  items: ProductDTO[]
  total: number
  page: number
  pageSize: number
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
        list(query: ProductsListQuery): Promise<ProductsListResult>
        create(payload: CreateProductPayload): Promise<ProductDTO>
        update(id: number, payload: Partial<CreateProductPayload>): Promise<ProductDTO>
        remove(id: number): Promise<{ ok: true }>
      }
      sales: {
        create(): Promise<SaleDTO>
        addByBarcode(saleId: number, barcodeOrSku: string, qty: number): Promise<SaleDTO>
        pay(saleId: number, payments: PayItem[]): Promise<SaleDTO>
      }
    }
  }
}
