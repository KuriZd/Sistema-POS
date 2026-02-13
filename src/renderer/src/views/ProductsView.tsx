import { useEffect, useState } from 'react'
import type { JSX } from 'react'

type ProductDTO = {
  id: number
  sku: string
  barcode: string | null
  name: string
  price: number
  stock: number
}

export default function ProductsView(): JSX.Element {
  const [items, setItems] = useState<ProductDTO[]>([])
  const [loading, setLoading] = useState(true)

  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('0')
  const [stock, setStock] = useState('0')

  async function refresh(): Promise<void> {
    setLoading(true)
    const list = await window.pos.products.list()
    setItems(list)
    setLoading(false)
  }

  useEffect(() => {
    ;(async () => {
      await refresh()
    })()
  }, [])

  async function createProduct(): Promise<void> {
    await window.pos.products.create({
      sku: sku.trim(),
      barcode: barcode.trim() || null,
      name: name.trim(),
      price: Number(price),
      stock: Number(stock)
    })

    setSku('')
    setBarcode('')
    setName('')
    setPrice('0')
    setStock('0')

    await refresh()
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2>Productos</h2>

      <section style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
        <strong>Nuevo producto</strong>

        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" />
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Barcode (opcional)"
          />
        </div>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />

        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Precio (centavos)"
          />
          <input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stock" />
        </div>

        <button onClick={() => void createProduct()}>Guardar</button>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <strong>Listado</strong>
        {loading ? (
          <div>Cargando...</div>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {items.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  <strong>{p.name}</strong> — {p.sku} {p.barcode ? `(${p.barcode})` : ''}
                </span>
                <span>
                  ${(p.price / 100).toFixed(2)} | Stock: {p.stock}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
