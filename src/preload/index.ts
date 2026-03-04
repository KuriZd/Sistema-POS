// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

// -----------------------------
// Types (locales al preload)
// -----------------------------
type CreateProductPayload = {
  sku: string
  name: string

  // centavos
  price: number
  cost: number

  // pct * 100
  profitPctBp: number

  barcode?: string | null

  stock?: number
  stockMin?: number
  stockMax?: number

  imageDataUrl?: string | null
}

type ProductsListQuery = { page: number; pageSize: number; search?: string }

type ServiceSupplyInput = {
  productId: number
  qty: number
}

type CreateServicePayload = {
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

type ServicesListQuery = { page: number; pageSize: number; search?: string; active?: boolean }

// NOTA: si quieres estrictamente tipado, conviene usar un union del enum
// type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'
type PayItem = {
  method: string
  amount: number
  reference?: string | null
}

contextBridge.exposeInMainWorld('pos', {
  // -----------------------------
  // Auth
  // -----------------------------
  auth: {
    login: (pin: string) => ipcRenderer.invoke('auth:login', pin),
    me: () => ipcRenderer.invoke('auth:me'),
    logout: () => ipcRenderer.invoke('auth:logout')
  },

  // -----------------------------
  // Products
  // -----------------------------
  products: {
    list: (query: ProductsListQuery) => ipcRenderer.invoke('products:list', query),
    get: (id: number) => ipcRenderer.invoke('products:get', id),
    update: (id: number, payload: Partial<CreateProductPayload>) =>
      ipcRenderer.invoke('products:update', id, payload),
    create: (payload: CreateProductPayload) => ipcRenderer.invoke('products:create', payload),
    // Eliminar = soft delete (active=false) en main
    remove: (id: number) => ipcRenderer.invoke('products:remove', id)
  },

  // -----------------------------
  // Services
  // -----------------------------
  services: {
    list: (query: ServicesListQuery) => ipcRenderer.invoke('services:list', query),
    get: (id: number) => ipcRenderer.invoke('services:get', id),
    getByCode: (code: string) => ipcRenderer.invoke('services:getByCode', code),
    create: (payload: CreateServicePayload) => ipcRenderer.invoke('services:create', payload),
    update: (id: number, payload: Partial<CreateServicePayload>) =>
      ipcRenderer.invoke('services:update', id, payload),
    // Eliminar = soft delete (active=false) en main
    remove: (id: number) => ipcRenderer.invoke('services:remove', id)
  },

  // -----------------------------
  // Sales
  // -----------------------------
  sales: {
    create: () => ipcRenderer.invoke('sales:create'),
    addByBarcode: (saleId: number, barcodeOrSku: string, qty: number) =>
      ipcRenderer.invoke('sales:addByBarcode', { saleId, barcodeOrSku, qty }),
    pay: (saleId: number, payments: PayItem[]) =>
      ipcRenderer.invoke('sales:pay', { saleId, payments })
  }
})