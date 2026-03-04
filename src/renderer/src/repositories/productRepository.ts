// src/renderer/src/repositories/productRepository.ts
import type { CreateProductPayload } from '../types/pos'

export const productRepository = {
  async create(payload: CreateProductPayload): Promise<{ id: number }> {
    return await window.pos.products.create(payload)
  }
}