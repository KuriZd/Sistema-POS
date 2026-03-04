// src/renderer/src/views/ProductsView.tsx
import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import btnAddIcon from '../../assets/btnadd.png'
import btnFiltroIcon from '../../assets/btnfiltro.png'
import styles from './ProductsView.module.css'
import { FaHandshake } from 'react-icons/fa'
import { AiOutlineProduct } from 'react-icons/ai'
import { FiClock, FiType } from 'react-icons/fi'
import AddProductModal from './AddProductModal'
import AddServiceModal from '../services/AddServicesModal'
import { serviceRepository, type ServiceDetails } from '../../repositories/serviceRepository'
import FiltersDropdown, { type FilterKey, type FilterOption } from '../../components/FiltersDropdown/FiltersDropdown'

type ProductDTO = {
  id: number
  sku: string
  barcode: string | null
  name: string
  price: number
  stock: number | null
  active: boolean
}

type ProductsListResult = {
  items: ProductDTO[]
  total: number
  page: number
  pageSize: number
}

type ServicesListResult = {
  items: ServiceDetails[]
  total: number
  page: number
  pageSize: number
}

type ViewMode = 'products' | 'services'

function sortProducts(items: ProductDTO[], key: FilterKey): ProductDTO[] {
  const copy = [...items]

  if (key === 'age') {
    copy.sort((a, b) => a.id - b.id)
    return copy
  }

  if (key === 'alpha') {
    copy.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    return copy
  }

  if (key === 'stock') {
    copy.sort((a, b) => (b.stock ?? -1) - (a.stock ?? -1))
    return copy
  }

  return copy
}

function sortServices(items: ServiceDetails[], key: FilterKey): ServiceDetails[] {
  const copy = [...items]

  if (key === 'age') {
    copy.sort((a, b) => a.id - b.id)
    return copy
  }

  if (key === 'alpha') {
    copy.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    return copy
  }

  return copy
}

const FILTER_LABELS: Record<FilterKey, string> = {
  age: 'Antigüedad',
  stock: 'Stock',
  alpha: 'Alfabético'
}

export default function ProductsView(): JSX.Element {
  const [mode, setMode] = useState<ViewMode>('products')

  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)

  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingServices, setLoadingServices] = useState(false)

  const [productsData, setProductsData] = useState<ProductsListResult>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20
  })

  const [servicesData, setServicesData] = useState<ServicesListResult>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20
  })

  const currentData = mode === 'products' ? productsData : servicesData
  const loading = mode === 'products' ? loadingProducts : loadingServices

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(currentData.total / currentData.pageSize)),
    [currentData.total, currentData.pageSize]
  )

  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)

  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)

  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterKey, setFilterKey] = useState<FilterKey>('alpha')
  const filterBtnRef = useRef<HTMLButtonElement | null>(null)

  const serviceFilterOptions: FilterOption[] = useMemo(
    () => [
      { key: 'age', label: 'Antigüedad', icon: <FiClock /> },
      { key: 'alpha', label: 'Alfabético', icon: <FiType /> }
    ],
    []
  )

  useEffect(() => {
    setFiltersOpen(false)

    if (mode === 'services' && filterKey === 'stock') {
      setFilterKey('alpha')
    }
  }, [mode, filterKey])

  async function fetchProductsList(nextPage = page, nextPageSize = pageSize, nextSearch = search): Promise<void> {
    setLoadingProducts(true)

    const res = await window.pos.products.list({
      page: nextPage,
      pageSize: nextPageSize,
      search: nextSearch.trim() || undefined
    })

    // Blindaje: si por alguna razón llega un inactivo, lo ocultamos
    const activeItems = res.items.filter((p: ProductDTO) => p.active)

    setProductsData({
      ...res,
      items: activeItems
    })

    setLoadingProducts(false)
  }

  async function fetchServicesList(nextPage = page, nextPageSize = pageSize, nextSearch = search): Promise<void> {
    setLoadingServices(true)

    // Ideal: el backend ya filtra solo active=true por defecto (services:list)
    const res = await serviceRepository.list({
      page: nextPage,
      pageSize: nextPageSize,
      search: nextSearch.trim()
    })

    setServicesData(res)
    setLoadingServices(false)
  }

  async function fetchCurrentList(
    nextPage = page,
    nextPageSize = pageSize,
    nextSearch = search,
    nextMode = mode
  ): Promise<void> {
    if (nextMode === 'products') {
      await fetchProductsList(nextPage, nextPageSize, nextSearch)
      return
    }
    await fetchServicesList(nextPage, nextPageSize, nextSearch)
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) {
        setPage(1)
        return
      }
      void fetchCurrentList(1, pageSize, search, mode)
    }, 250)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, pageSize, mode])

  useEffect(() => {
    void fetchCurrentList(page, pageSize, search, mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, mode])

  async function handleDeleteProduct(id: number): Promise<void> {
    await window.pos.products.remove(id)

    const fallbackPage = page > 1 && productsData.items.length === 1 ? page - 1 : page
    setPage(fallbackPage)
    await fetchProductsList(fallbackPage, pageSize, search)
  }

  async function handleDeleteService(id: number): Promise<void> {
    await window.pos.services.remove(id)

    const fallbackPage = page > 1 && servicesData.items.length === 1 ? page - 1 : page
    setPage(fallbackPage)
    await fetchServicesList(fallbackPage, pageSize, search)
  }

  function openCreateProductModal(): void {
    setEditingProductId(null)
    setProductModalOpen(true)
  }

  function openCreateServiceModal(): void {
    setEditingServiceId(null)
    setServiceModalOpen(true)
  }

  function openEditProductModal(productId: number): void {
    setEditingProductId(productId)
    setProductModalOpen(true)
  }

  function openEditServiceModal(serviceId: number): void {
    setEditingServiceId(serviceId)
    setServiceModalOpen(true)
  }

  function closeProductModal(): void {
    setProductModalOpen(false)
    setEditingProductId(null)
    void fetchProductsList(page, pageSize, search)
  }

  function closeServiceModal(): void {
    setServiceModalOpen(false)
    setEditingServiceId(null)
    void fetchServicesList(page, pageSize, search)
  }

  function formatMoneyFromCents(cents: number): string {
    const value = (cents ?? 0) / 100
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
  }

  function closeAddMenu(): void {
    setAddMenuOpen(false)
  }

  function toggleAddMenu(): void {
    setAddMenuOpen((v) => !v)
  }

  function handleAddOption(option: 'product' | 'service' | 'assign'): void {
    closeAddMenu()

    queueMicrotask(() => {
      if (option === 'product') {
        openCreateProductModal()
        return
      }

      if (option === 'service') {
        openCreateServiceModal()
        return
      }

      if (option === 'assign') console.log('Agregar -> Asignar tutor')
    })
  }

  useEffect(() => {
    if (!addMenuOpen) return

    function onPointerDown(e: PointerEvent): void {
      const target = e.target as Node | null
      if (!target) return
      if (addMenuRef.current && !addMenuRef.current.contains(target)) closeAddMenu()
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') closeAddMenu()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [addMenuOpen])

  const visibleProductItems = useMemo(() => sortProducts(productsData.items, filterKey), [productsData.items, filterKey])

  const visibleServiceItems = useMemo(() => sortServices(servicesData.items, filterKey), [servicesData.items, filterKey])

  const startIndex = (currentData.page - 1) * currentData.pageSize + 1
  const endIndex = Math.min(currentData.total, currentData.page * currentData.pageSize)
  const searchPlaceholder = mode === 'products' ? 'Buscar productos...' : 'Buscar servicios...'
  const filterLabel = FILTER_LABELS[filterKey]

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.topbar}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className={styles.btnGhost}
              type="button"
              onClick={() => setMode('products')}
              aria-pressed={mode === 'products'}
              title="Ver productos"
              style={{ opacity: mode === 'products' ? 1 : 0.65 }}
            >
              <AiOutlineProduct style={{ marginRight: 8 }} />
              Productos
            </button>

            <button
              className={styles.btnGhost}
              type="button"
              onClick={() => setMode('services')}
              aria-pressed={mode === 'services'}
              title="Ver servicios"
              style={{ opacity: mode === 'services' ? 1 : 0.65 }}
            >
              <FaHandshake style={{ marginRight: 8 }} />
              Servicios
            </button>

            <div className={styles.searchWrap}>
              <span aria-hidden>🔎</span>
              <input
                className={styles.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <div className={styles.addMenuWrap} ref={addMenuRef}>
              <button className={`${styles.btn} ${styles.addBtn}`} type="button" onClick={toggleAddMenu}>
                <span>Agregar</span>
                <img className={styles.addIcon} src={btnAddIcon} alt="" />
              </button>

              {addMenuOpen && (
                <div className={styles.dropdown} role="menu" aria-label="Agregar">
                  <button className={styles.dropdownItem} type="button" onClick={() => handleAddOption('product')}>
                    <span className={styles.dropdownIcon}>
                      <AiOutlineProduct />
                    </span>
                    <span>Producto</span>
                  </button>

                  <button className={styles.dropdownItem} type="button" onClick={() => handleAddOption('service')}>
                    <span className={styles.dropdownIcon}>
                      <FaHandshake />
                    </span>
                    <span>Servicio</span>
                  </button>
                </div>
              )}
            </div>

            <button
              ref={filterBtnRef}
              className={styles.btnGhost}
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-label="Filtros"
              title={`Filtros: ${filterLabel}`}
              aria-expanded={filtersOpen}
            >
              <span>{filterLabel}</span>
              <img src={btnFiltroIcon} alt="Filtros" className={styles.filterIcon} />
            </button>

            <select
              className={styles.select}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Cantidad por página"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className={styles.tableWrap}>
          {mode === 'products' ? (
            <div className={styles.tableHeader}>
              <div>#</div>
              <div>Nombre</div>
              <div>Stock</div>
              <div>Precio</div>
              <div>Código</div>
              <div />
            </div>
          ) : (
            <div className={styles.tableHeader}>
              <div>#</div>
              <div>Nombre</div>
              <div>Duración</div>
              <div>Precio</div>
              <div>Código</div>
              <div />
            </div>
          )}

          {loading ? (
            <div className={styles.row}>
              <div className={styles.muted}>...</div>
              <div className={styles.muted}>Cargando...</div>
              <div />
              <div />
              <div />
              <div />
            </div>
          ) : currentData.items.length === 0 ? (
            <div className={styles.row}>
              <div className={styles.muted}>-</div>
              <div className={styles.muted}>Sin resultados</div>
              <div />
              <div />
              <div />
              <div />
            </div>
          ) : mode === 'products' ? (
            visibleProductItems.map((p, idx) => (
              <div key={p.id} className={styles.row}>
                <div>{(productsData.page - 1) * productsData.pageSize + idx + 1}</div>
                <div>{p.name}</div>
                <div className={styles.muted}>{p.stock ?? 'N/A'}</div>
                <div>{formatMoneyFromCents(p.price)}</div>
                <div className={styles.muted}>{p.barcode ?? p.sku}</div>

                <div className={styles.actionsCell}>
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnEdit}`}
                    type="button"
                    onClick={() => openEditProductModal(p.id)}
                    aria-label="Editar"
                    title="Editar"
                  >
                    ✎
                  </button>

                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                    type="button"
                    onClick={() => void handleDeleteProduct(p.id)}
                    aria-label="Eliminar"
                    title="Eliminar"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          ) : (
            visibleServiceItems.map((s, idx) => (
              <div key={s.id} className={styles.row}>
                <div>{(servicesData.page - 1) * servicesData.pageSize + idx + 1}</div>
                <div>{s.name}</div>
                <div className={styles.muted}>{s.durationMin ? `${s.durationMin} min` : 'N/A'}</div>
                <div>{formatMoneyFromCents(s.price)}</div>
                <div className={styles.muted}>{s.code}</div>

                <div className={styles.actionsCell}>
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnEdit}`}
                    type="button"
                    onClick={() => openEditServiceModal(s.id)}
                    aria-label="Editar"
                    title="Editar"
                  >
                    ✎
                  </button>

                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                    type="button"
                    onClick={() => void handleDeleteService(s.id)}
                    aria-label="Eliminar"
                    title="Eliminar"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.pagination}>
          <span className={styles.muted}>
            {currentData.total === 0 ? '0' : `${startIndex}-${endIndex}`} de {currentData.total}
          </span>

          <button className={styles.pageBtn} type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ←
          </button>

          <div className={styles.pageIndicator}>
            <span className={styles.muted}>
              Página {page} / {totalPages}
            </span>
          </div>

          <button className={styles.pageBtn} type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            →
          </button>
        </div>
      </div>

      <FiltersDropdown
        open={filtersOpen}
        anchorRef={filterBtnRef}
        selected={filterKey}
        onSelect={(k) => setFilterKey(k)}
        onClose={() => setFiltersOpen(false)}
        options={mode === 'services' ? serviceFilterOptions : undefined}
      />

      <AddProductModal open={productModalOpen} productId={editingProductId} onClose={closeProductModal} />

      <AddServiceModal
        open={serviceModalOpen}
        serviceId={editingServiceId}
        onClose={closeServiceModal}
        key={editingServiceId ?? 'new'}
      />
    </div>
  )
}