import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('pos', {
  auth: {
    login: (pin: string) => ipcRenderer.invoke('auth:login', pin),
    me: () => ipcRenderer.invoke('auth:me'),
    logout: () => ipcRenderer.invoke('auth:logout')
  },
  products: {
    list: () => ipcRenderer.invoke('products:list'),
    create: (payload: Record<string, unknown>) => ipcRenderer.invoke('products:create', payload)
  },
  sales: {
    create: () => ipcRenderer.invoke('sales:create'),
    addByBarcode: (saleId: number, barcodeOrSku: string, qty: number) =>
      ipcRenderer.invoke('sales:addByBarcode', { saleId, barcodeOrSku, qty }),
    pay: (saleId: number, payments: Record<string, unknown>[]) =>
      ipcRenderer.invoke('sales:pay', { saleId, payments })
  }
})
