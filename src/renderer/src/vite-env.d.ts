// src/renderer/src/vite-env.d.ts
/// <reference types="vite/client" />

import type { PaymentMethod, Role } from '@prisma/client'

type AuthUser = { id: number; name: string; role: Role }
type AuthLoginResult = { ok: true; user: AuthUser } | { ok: false; error: string }

// ------------------------------------------------------
// Products
// ------------------------------------------------------

/**
 * Payload para crear producto (alineado con products.ipc.ts).
 * - Los campos numéricos se mandan en "cents" / enteros según tu UI.
 * - barcode es opcional; si no se manda, el main usa sku por defecto.
 */
type CreateProductPayload = {
  sku: string
  name: string
  price: number
  barcode?: string | null

  cost?: number
  profitPctBp?: number

  stock?: number
  stockMin?: number
  stockMax?: number

  imageDataUrl?: string | null
}

type ProductListItemDTO = {
  id: number
  sku: string
  barcode: string | null
  name: string
  price: number
  stock: number | null
}

type ProductDetailsDTO = {
  id: number
  sku: string
  barcode: string | null
  name: string
  price: number
  cost: number
  profitPctBp: number
  stock: number
  stockMin: number
  stockMax: number
  imageUrl: string | null
  active: boolean
}

type ProductsListQuery = { page: number; pageSize: number; search?: string }
type ProductsListResult = {
  items: ProductListItemDTO[]
  total: number
  page: number
  pageSize: number
}

// ------------------------------------------------------
// Sales
// ------------------------------------------------------

type SaleDTO = {
  id: number
  folio: string
  subtotal: number
  tax: number
  total: number
  status: 'PAID' | 'CANCELED' | 'REFUNDED'
  cashierId: number
  createdAt: string | Date
}

type PayItem = { method: PaymentMethod; amount: number; reference?: string | null }

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
        get(id: number): Promise<ProductDetailsDTO>
        create(payload: CreateProductPayload): Promise<{ id: number }>
        update(id: number, payload: Partial<CreateProductPayload>): Promise<{ id: number }>
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

export {}
