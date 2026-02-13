// src/renderer/src/views/PosView.tsx
import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'

type SaleDTO = {
  id: number
  total: number
  folio: string
}

export default function PosView(): JSX.Element {
  // Mantiene el foco en el input para escáner (que funciona como teclado)
  const inputRef = useRef<HTMLInputElement>(null)

  // Evita doble inicialización en dev (React StrictMode)
  const didInitRef = useRef(false)

  const [sale, setSale] = useState<SaleDTO | null>(null)
  const [scan, setScan] = useState('')

  /**
   * Crea una venta nueva en backend (main) y la regresa.
   * Nota: NO hace setState, para que el linter no marque "setState en effect".
   */
  async function createSale(): Promise<SaleDTO> {
    return window.pos.sales.create()
  }

  /**
   * Carga una venta inicial al montar el componente.
   */
  useEffect(() => {
    if (didInitRef.current) return
    didInitRef.current = true

    let alive = true

    void (async () => {
      const created = await createSale()
      if (alive) setSale(created)
    })()

    return () => {
      alive = false
    }
  }, [])

  /**
   * Mantiene el foco del input (solo side-effect de UI).
   */
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function startNewSale(): Promise<void> {
    const created = await createSale()
    setSale(created)
    setScan('')
    inputRef.current?.focus()
  }

  async function addByScan(): Promise<void> {
    if (!sale) return

    const code = scan.trim()
    if (!code) return

    const updated = await window.pos.sales.addByBarcode(sale.id, code, 1)
    setSale(updated)
    setScan('')
    inputRef.current?.focus()
  }

  async function payCash(): Promise<void> {
    if (!sale) return
    if (sale.total <= 0) return

    await window.pos.sales.pay(sale.id, [{ method: 'CASH', amount: sale.total }])
    await startNewSale()
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2>Caja</h2>

      <div style={{ opacity: 0.8, fontSize: 12 }}>Venta: {sale?.folio ?? '...'}</div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          value={scan}
          onChange={(e) => setScan(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addByScan()
          }}
          placeholder="Escanea SKU/Barcode y Enter"
        />

        <button onClick={() => void addByScan()}>Agregar</button>
        <button onClick={() => void startNewSale()}>Nueva venta</button>
      </div>

      <div>
        <strong>Total:</strong> ${((sale?.total ?? 0) / 100).toFixed(2)}
      </div>

      <div>
        <button onClick={() => void payCash()}>Cobrar (Efectivo)</button>
      </div>
    </div>
  )
}
