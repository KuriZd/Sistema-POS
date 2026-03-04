import { registerProductsIpc } from './products.ipc'
import { registerServicesIpc } from './services.ipc'

export function registerIpcHandlers(): void {
  registerProductsIpc()
  registerServicesIpc()
}
