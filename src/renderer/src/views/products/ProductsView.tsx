// src/renderer/src/views/ProductsView.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import btnAddIcon from '../../assets/btnadd.png'
import styles from './ProductsView.module.css'
import { FaHandshake } from 'react-icons/fa'
// import { MdHandshake } from "react-icons/md";
import { AiOutlineProduct } from 'react-icons/ai'
import AddProductModal from './AddProductModal'
import type { JSX } from 'react'

type ProductDTO = {
  id: number
  sku: string
  barcode: string | null
  name: string
  price: number
  stock: number | null
}

type ProductsListResult = {
  items: ProductDTO[]
  total: number
  page: number
  pageSize: number
}

export default function ProductsView(): JSX.Element {
  // -----------------------------
  // State: listado/paginación
  // -----------------------------
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ProductsListResult>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20
  })

  // -----------------------------
  // State: dropdown "Agregar"
  // -----------------------------
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)
  const [productModalOpen, setProductModalOpen] = useState(false)

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(data.total / data.pageSize)),
    [data.total, data.pageSize]
  )

  async function fetchList(
    nextPage = page,
    nextPageSize = pageSize,
    nextSearch = search
  ): Promise<void> {
    setLoading(true)
    const res = await window.pos.products.list({
      page: nextPage,
      pageSize: nextPageSize,
      search: nextSearch.trim() || undefined
    })
    setData(res)
    setLoading(false)
  }

  useEffect(() => {
    // Debounce simple para no invocar IPC en cada tecla
    const t = setTimeout(() => {
      void fetchList(1, pageSize, search)
      setPage(1)
    }, 250)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, pageSize])

  useEffect(() => {
    void fetchList(page, pageSize, search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  async function handleDelete(id: number): Promise<void> {
    await window.pos.products.remove(id)
    const fallbackPage = page > 1 && data.items.length === 1 ? page - 1 : page
    setPage(fallbackPage)
    await fetchList(fallbackPage, pageSize, search)
  }

  // -----------------------------
  // Dropdown helpers
  // -----------------------------
  function closeAddMenu(): void {
    setAddMenuOpen(false)
  }

  function toggleAddMenu(): void {
    setAddMenuOpen((v) => !v)
  }

  function handleAddOption(option: 'product' | 'service' | 'assign'): void {
    closeAddMenu()

    if (option === 'product') setProductModalOpen(true)

    // TODO: conectar con modales reales
    if (option === 'product') console.log('Agregar -> Producto')
    if (option === 'service') console.log('Agregar -> Servicio')
    if (option === 'assign') console.log('Agregar -> Asignar tutor')
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

  const startIndex = (data.page - 1) * data.pageSize + 1
  const endIndex = Math.min(data.total, data.page * data.pageSize)

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        {/* Top bar */}
        <div className={styles.topbar}>
          <div className={styles.searchWrap}>
            <span aria-hidden>🔎</span>
            <input
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ..."
            />
          </div>

          <div className={styles.actions}>
            {/* Agregar (dropdown) */}
            <div className={styles.addMenuWrap} ref={addMenuRef}>
              <button className={`${styles.btn} ${styles.addBtn}`} onClick={toggleAddMenu}>
                <span>Agregar</span>
                <img className={styles.addIcon} src={btnAddIcon} alt="" />
              </button>

              {addMenuOpen && (
                <div className={styles.dropdown} role="menu" aria-label="Agregar">
                  <button
                    className={styles.dropdownItem}
                    onClick={() => handleAddOption('product')}
                  >
                    <span className={styles.dropdownIcon}>
                      <AiOutlineProduct />
                    </span>
                    <span>Producto</span>
                  </button>

                  <button
                    className={styles.dropdownItem}
                    onClick={() => handleAddOption('service')}
                  >
                    <span className={styles.dropdownIcon}>
                      <FaHandshake />
                    </span>
                    <span>Servicio</span>
                  </button>

                  {/* <button className={styles.dropdownItem} onClick={() => handleAddOption('assign')}>
                    <span className={styles.dropdownIcon}>
                      <FaChalkboardTeacher />
                    </span>
                    <span>Asignar tutor</span>
                  </button> */}
                </div>
              )}
            </div>

            <button className={styles.btnGhost} onClick={() => console.log('TODO: filtros')}>
              Filtros ⚙
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

        {/* Tabla */}
        <div className={styles.tableWrap}>
          <div className={styles.tableHeader}>
            <div>#</div>
            <div>Nombre</div>
            <div>Stock</div>
            <div>Precio</div>
            <div>Código</div>
            <div />
          </div>

          {loading ? (
            <div className={styles.row}>
              <div className={styles.muted}>...</div>
              <div className={styles.muted}>Cargando...</div>
              <div />
              <div />
              <div />
              <div />
            </div>
          ) : data.items.length === 0 ? (
            <div className={styles.row}>
              <div className={styles.muted}>-</div>
              <div className={styles.muted}>Sin resultados</div>
              <div />
              <div />
              <div />
              <div />
            </div>
          ) : (
            data.items.map((p, idx) => (
              <div key={p.id} className={styles.row}>
                <div>{(data.page - 1) * data.pageSize + idx + 1}</div>
                <div>{p.name}</div>
                <div className={styles.muted}>{p.stock ?? 'N/A'}</div>
                <div>{p.price}</div>
                <div className={styles.muted}>{p.barcode ?? p.sku}</div>

                <div className={styles.actionsCell}>
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnEdit}`}
                    onClick={() => console.log('TODO: editar', p.id)}
                    aria-label="Editar"
                    title="Editar"
                  >
                    ✎
                  </button>

                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                    onClick={() => void handleDelete(p.id)}
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

        {/* Footer/paginación */}
        <div className={styles.pagination}>
          <span className={styles.muted}>
            {data.total === 0 ? '0' : `${startIndex}-${endIndex}`} de {data.total}
          </span>

          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ←
          </button>

          <span className={styles.muted}>
            {page} / {totalPages}
          </span>

          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </button>
        </div>
      </div>
      <AddProductModal open={productModalOpen} onClose={() => setProductModalOpen(false)} />
    </div>
  )
}
