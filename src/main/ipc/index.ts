import { registerProductsIpc } from './products.ipc'

export function registerIpcHandlers(): void {
  registerProductsIpc()
}
