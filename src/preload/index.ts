// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { CreateProductPayload } from '../renderer/src/repositories/productRepository'

contextBridge.exposeInMainWorld('pos', {
  auth: {
    login: (pin: string) => ipcRenderer.invoke('auth:login', pin),
    me: () => ipcRenderer.invoke('auth:me'),
    logout: () => ipcRenderer.invoke('auth:logout')
  },
  products: {
    list: (query: Record<string, unknown>) => ipcRenderer.invoke('products:list', query),
    update: (id: number, payload: Record<string, unknown>) =>
      ipcRenderer.invoke('products:update', id, payload),
    create: (payload: CreateProductPayload) => ipcRenderer.invoke('products:create', payload),

    remove: (id: number) => ipcRenderer.invoke('products:remove', id)
  },
  sales: {
    create: () => ipcRenderer.invoke('sales:create'),
    addByBarcode: (saleId: number, barcodeOrSku: string, qty: number) =>
      ipcRenderer.invoke('sales:addByBarcode', { saleId, barcodeOrSku, qty }),
    pay: (saleId: number, payments: Record<string, unknown>[]) =>
      ipcRenderer.invoke('sales:pay', { saleId, payments })
  }
})
