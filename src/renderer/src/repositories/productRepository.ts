// src/renderer/src/repositories/productRepository.ts

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
    pos: {
      products: {
        create: (payload: CreateProductPayload) => Promise<{ id: number }>
      }
    }
  }
}

export const productRepository = {
  async create(payload: CreateProductPayload): Promise<{ id: number }> {
    if (!window.pos?.products?.create) {
      throw new Error('POS API no disponible (preload no expuesto)')
    }

    return await window.pos.products.create(payload)
  }
}
