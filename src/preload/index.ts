// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

// -----------------------------
// Types (locales al preload)
// -----------------------------
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

type ProductsListQuery = { page: number; pageSize: number; search?: string }

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
    remove: (id: number) => ipcRenderer.invoke('products:remove', id)
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
