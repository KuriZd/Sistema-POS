// src/renderer/src/repositories/serviceRepository.ts
/* -------------------------------------------------------------------------- */
/* Types                                   */
/* -------------------------------------------------------------------------- */

export type ServiceSupplyInput = {
  productId: number
  qty: number
}

export type CreateServicePayload = {
  code: string
  name: string
  durationMin: number
  // centavos
  cost: number
  price: number
  // porcentaje * 100 (basis points)
  profitPctBp: number
  // insumos (productos consumibles)
  supplies: ServiceSupplyInput[]
}

export type ServiceDetails = {
  id: number
  code: string
  name: string
  durationMin: number
  cost: number
  price: number
  profitPctBp: number
  supplies?: ServiceSupplyInput[]
}

export type ServicesListArgs = {
  search: string
  page: number
  pageSize: number
}

export type ServicesListResult = {
  items: ServiceDetails[]
  total: number
  page: number
  pageSize: number
}

/* -------------------------------------------------------------------------- */
/* Bridge (window.pos)                             */
/* -------------------------------------------------------------------------- */

type ServicesBridge = {
  create?: (payload: CreateServicePayload) => Promise<{ id: number }>
  update?: (id: number, payload: Partial<CreateServicePayload>) => Promise<void>
  get?: (id: number) => Promise<ServiceDetails>
  getByCode?: (code: string) => Promise<ServiceDetails | null>
  list?: (args: ServicesListArgs) => Promise<ServicesListResult>
}

function getServicesBridge(): ServicesBridge | null {
  const w = window as unknown as { pos?: { services?: ServicesBridge } }
  return w.pos?.services ?? null
}

/**
 * Validates that a bridge function exists before calling it.
 * Uses NonNullable<T> to strip 'undefined' from the optional bridge methods.
 */
function requireFn<T>(fn: T, errorMessage: string): NonNullable<T> {
  if (typeof fn !== 'function') {
    throw new Error(errorMessage)
  }
  return fn as NonNullable<T>
}

/* -------------------------------------------------------------------------- */
/* Repository                                 */
/* -------------------------------------------------------------------------- */

export const serviceRepository = {
  async create(payload: CreateServicePayload): Promise<{ id: number }> {
    const api = getServicesBridge()
    const create = requireFn(api?.create, 'No existe services.create en el bridge.')
    return await create(payload)
  },

  async update(id: number, payload: Partial<CreateServicePayload>): Promise<void> {
    const api = getServicesBridge()
    const update = requireFn(api?.update, 'No existe services.update en el bridge.')
    await update(id, payload)
  },

  async get(id: number): Promise<ServiceDetails> {
    const api = getServicesBridge()
    const get = requireFn(api?.get, 'No existe services.get en el bridge.')
    return await get(id)
  },

  async getByCode(code: string): Promise<ServiceDetails | null> {
    const api = getServicesBridge()
    const getByCode = requireFn(api?.getByCode, 'No existe services.getByCode en el bridge.')
    return await getByCode(code)
  },

  async list(args: ServicesListArgs): Promise<ServicesListResult> {
    const api = getServicesBridge()
    const list = requireFn(api?.list, 'No existe services.list en el bridge.')
    return await list(args)
  }
}