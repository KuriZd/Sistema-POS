// src/renderer/src/types/pos.d.ts
export {}

export type CreateProductPayload = {
  sku: string
  name: string
  price: number
  cost: number
  profitPctBp: number
  stock: number
  stockMin: number
  stockMax: number
  imageDataUrl: string | null
}

export type ProductsListArgs = {
  page: number
  pageSize: number
  search?: string
}

export type ProductListItem = {
  id: number
  sku: string
  barcode: string | null
  name: string
  price: number
  stock: number | null
  active: boolean
}

export type ProductsListResult = {
  items: ProductListItem[]
  total: number
  page: number
  pageSize: number
}

export type ServicesListArgs = {
  page: number
  pageSize: number
  search?: string
  active?: boolean
}

export type ServiceListItem = {
  id: number
  code: string
  name: string
  price: number
  cost: number
  profitPctBp: number
  durationMin: number
  active: boolean
  createdAt: string
}

export type ServicesListResult = {
  items: ServiceListItem[]
  total: number
  page: number
  pageSize: number
}

declare global {
  interface Window {
    pos: {
      products: {
        create: (payload: CreateProductPayload) => Promise<{ id: number }>
        list: (args: ProductsListArgs) => Promise<ProductsListResult>
        get: (id: number) => Promise<unknown>
        update: (id: number, payload: Partial<CreateProductPayload>) => Promise<{ id: number }>
        remove: (id: number) => Promise<{ ok: true }>
      }
      services: {
        list: (args: ServicesListArgs) => Promise<ServicesListResult>
        get: (id: number) => Promise<unknown>
        create: (payload: unknown) => Promise<unknown>
        update: (id: number, payload: unknown) => Promise<unknown>
        remove: (id: number) => Promise<{ ok: true }>
      }
    }
  }
}