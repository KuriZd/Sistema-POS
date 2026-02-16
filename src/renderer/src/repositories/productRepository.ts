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

declare global {
  interface Window {
    api: {
      products: {
        create: (payload: CreateProductPayload) => Promise<{ id: number }>
      }
    }
  }
}

export const productRepository = {
  async create(payload: CreateProductPayload): Promise<{ id: number }> {
    if (!window.api?.products?.create) throw new Error('API no disponible (preload no expuesto)')
    return await window.api.products.create(payload)
  }
}
