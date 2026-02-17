import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { CreateProductPayload } from '../main/ipc/products.ipc'

const api = {
  products: {
    create: (payload: CreateProductPayload) => ipcRenderer.invoke('products:create', payload)
  }
}

declare global {
  interface Window {
    electron: typeof electronAPI
    api: typeof api
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} else {
  window.electron = electronAPI
  window.api = api
}
