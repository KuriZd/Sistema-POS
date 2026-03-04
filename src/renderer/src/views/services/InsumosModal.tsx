import { useEffect, useMemo, useState, type JSX, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiMinusCircle, FiPlusCircle } from 'react-icons/fi'
import styles from './InsumosModal.module.css'

type ProductPickItem = {
    id: number
    name: string
    stock: number | null
    cost: number // cents
}

type ProductsListResult = {
    items: ProductPickItem[]
    total: number
    page: number
    pageSize: number
}

type ProductsBridge = {
    list?: (args: { search: string; page: number; pageSize: number }) => Promise<ProductsListResult>
}

function getProductsBridge(): ProductsBridge | null {
    const w = window as unknown as { pos?: { products?: ProductsBridge } }
    return w.pos?.products ?? null
}

type Props = {
    open: boolean
    initialSelected: Record<number, number>
    onClose: () => void
    onApply: (nextSelected: Record<number, number>, computedCostCents: number) => void
}

export default function InsumosModal({
    open,
    initialSelected,
    onClose,
    onApply
}: Props): JSX.Element | null {
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize] = useState(8)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [items, setItems] = useState<ProductPickItem[]>([])
    const [total, setTotal] = useState(0)

    // Copia local para permitir Cancelar sin afectar al padre
    const [selected, setSelected] = useState<Record<number, number>>({})

    useEffect(() => {
        if (!open) return
        setSelected(initialSelected)
    }, [open, initialSelected])

    useEffect(() => {
        if (!open) return

        const bridge = getProductsBridge()
        const list = bridge?.list

        if (typeof list !== 'function') {
            setError('No existe products.list en el bridge (preload/main).')
            return
        }

        let cancelled = false
        setLoading(true)
        setError(null)

        void (async () => {
            try {
                const res = await list({ search: search.trim(), page, pageSize })
                if (cancelled) return
                setItems(res.items)
                setTotal(res.total)
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'No se pudieron cargar los productos'
                setError(msg)
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [open, search, page, pageSize])

    const pages = Math.max(1, Math.ceil(total / pageSize))

    const productsById = useMemo(() => {
        const map = new Map<number, ProductPickItem>()
        for (const p of items) map.set(p.id, p)
        return map
    }, [items])

    const computedCostCents = useMemo(() => {
        let totalCents = 0

        for (const [idStr, qty] of Object.entries(selected)) {
            const productId = Number(idStr)
            if (!Number.isFinite(productId) || qty <= 0) continue

            const p = productsById.get(productId)
            if (!p) continue

            totalCents += p.cost * qty
        }

        return totalCents
    }, [selected, productsById])

    function setQty(productId: number, qty: number): void {
        setSelected((prev) => {
            const next = { ...prev }
            if (qty <= 0) {
                delete next[productId]
                return next
            }
            next[productId] = qty
            return next
        })
    }

    function handleBackdropMouseDown(e: MouseEvent<HTMLDivElement>): void {
        if (e.target === e.currentTarget) onClose()
    }

    function handleApply(): void {
        onApply(selected, computedCostCents)
        onClose()
    }

    if (!open) return null

    return createPortal(
        <div className={styles.backdrop} onMouseDown={handleBackdropMouseDown} role="dialog" aria-modal="true">
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Insumos</h3>

                    <button className={styles.closeBtn} type="button" onClick={onClose} aria-label="Cerrar">
                        <FiX />
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={styles.topBar}>
                        <input
                            className={styles.search}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setPage(1)
                            }}
                            placeholder="Buscar producto..."
                        />
                        <div className={styles.meta}>
                            <span>Costo operativo:</span>
                            <strong>${(computedCostCents / 100).toFixed(2)}</strong>
                        </div>
                    </div>

                    {loading ? <div className={styles.hint}>Cargando...</div> : null}
                    {error ? <div className={styles.error}>{error}</div> : null}

                    <div className={styles.table}>
                        <div className={styles.thead}>
                            <div>Nombre</div>
                            <div>Stock</div>
                            <div className={styles.center}>Cantidad</div>
                        </div>

                        <div className={styles.tbody}>
                            {items.map((p) => {
                                const qty = selected[p.id] ?? 0
                                const stockText = p.stock === null ? 'N/A' : String(p.stock)

                                return (
                                    <div key={p.id} className={styles.row}>
                                        <div className={styles.name}>{p.name}</div>
                                        <div className={styles.stock}>{stockText}</div>

                                        <div className={styles.qty}>
                                            <button
                                                type="button"
                                                className={styles.qtyBtn}
                                                onClick={() => setQty(p.id, qty - 1)}
                                                disabled={qty <= 0}
                                                aria-label="Disminuir"
                                            >
                                                <FiMinusCircle />
                                            </button>

                                            <span className={styles.qtyValue}>{qty}</span>

                                            <button
                                                type="button"
                                                className={styles.qtyBtn}
                                                onClick={() => setQty(p.id, qty + 1)}
                                                aria-label="Aumentar"
                                            >
                                                <FiPlusCircle />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className={styles.pagination}>
                        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                            {'<'}
                        </button>
                        <span>
                            {page} / {pages}
                        </span>
                        <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
                            {'>'}
                        </button>
                    </div>

                    <div className={styles.footer}>
                        <button className={styles.saveBtn} type="button" onClick={handleApply}>
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
