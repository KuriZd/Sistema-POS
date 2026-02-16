import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type MouseEvent,
  type ChangeEvent
} from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiSave, FiImage, FiHelpCircle, FiPrinter } from 'react-icons/fi'
import { MdOutlineQrCode2 } from 'react-icons/md'
import { CiBarcode } from 'react-icons/ci'
import { QRCodeSVG } from 'qrcode.react'
import styles from './AddProductModal.module.css'
import { productRepository, type CreateProductPayload } from '../../repositories/productRepository'

type Props = {
  open: boolean
  onClose: () => void
}

type FormState = {
  code: string
  name: string
  stockMin: string
  stockMax: string
  buyPrice: string
  sellPrice: string
  stock: string
  profitPct: string
}

const initialState: FormState = {
  code: '',
  name: '',
  stockMin: '',
  stockMax: '',
  buyPrice: '',
  sellPrice: '',
  stock: '',
  profitPct: ''
}

type PriceEditMode = 'sell' | 'pct' | null

function useEscapeToClose(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])
}

/* ----------------------------- Utils de código ---------------------------- */

function getCryptoRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0

  const hasCrypto = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'

  if (!hasCrypto) return Math.floor(Math.random() * maxExclusive)

  const range = 0xffffffff
  const limit = range - (range % maxExclusive)
  const buffer = new Uint32Array(1)

  let x = 0
  do {
    crypto.getRandomValues(buffer)
    x = buffer[0]
  } while (x >= limit)

  return x % maxExclusive
}

function generate8DigitCode(): string {
  const value = getCryptoRandomInt(100_000_000)
  return String(value).padStart(8, '0')
}

/* ---------------------------- Utils de números ---------------------------- */

function parseDecimal(input: string): number | null {
  const raw = input.trim()
  if (!raw) return null

  const normalized = raw.replace(/\s+/g, '').replace(/,/g, '.')
  const n = Number(normalized)
  if (!Number.isFinite(n)) return null

  return n
}

function parseInteger(input: string): number | null {
  const raw = input.trim()
  if (!raw) return null

  const n = Number(raw)
  if (!Number.isFinite(n)) return null

  return Math.trunc(n)
}

function formatNumber(n: number, decimals = 2): string {
  const fixed = n.toFixed(decimals)
  return fixed.replace(/\.?0+$/g, '')
}

function computeProfitPct(buy: number, sell: number): number | null {
  if (!(buy > 0)) return null
  return ((sell - buy) / buy) * 100
}

function computeSellPrice(buy: number, pct: number): number | null {
  if (!(buy > 0)) return null
  return buy * (1 + pct / 100)
}

function toCents(value: number): number {
  return Math.round(value * 100)
}

function pctToBp(pct: number): number {
  return Math.round(pct * 100)
}

/* --------------------------- Utils de archivos ---------------------------- */

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

async function buildCreateProductPayload(
  form: FormState,
  imageFile: File | null
): Promise<CreateProductPayload> {
  const buy = parseDecimal(form.buyPrice) ?? 0
  const sell = parseDecimal(form.sellPrice) ?? 0
  const pct = parseDecimal(form.profitPct) ?? 0

  const payload: CreateProductPayload = {
    sku: form.code.trim(),
    name: form.name.trim(),
    stock: parseInteger(form.stock) ?? 0,
    stockMin: parseInteger(form.stockMin) ?? 0,
    stockMax: parseInteger(form.stockMax) ?? 0,
    cost: toCents(buy),
    price: toCents(sell),
    profitPctBp: pctToBp(pct),
    imageDataUrl: null
  }

  if (imageFile) payload.imageDataUrl = await fileToDataUrl(imageFile)

  return payload
}

/* ------------------------------ UI Blocks -------------------------------- */

type ModalShellProps = {
  onClose: () => void
  children: JSX.Element
}

function ModalShell({ onClose, children }: ModalShellProps): JSX.Element {
  function handleBackdropMouseDown(e: MouseEvent<HTMLDivElement>): void {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  )
}

type ModalHeaderProps = {
  title: string
  onClose: () => void
}

function ModalHeader({ title, onClose }: ModalHeaderProps): JSX.Element {
  return (
    <div className={styles.header}>
      <h3 className={styles.title}>{title}</h3>

      <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
        <FiX />
      </button>
    </div>
  )
}

type SaveFooterProps = {
  onSave: () => void | Promise<void>
  disabled?: boolean
}

function SaveFooter({ onSave, disabled }: SaveFooterProps): JSX.Element {
  return (
    <div className={styles.footer}>
      <button className={styles.saveBtn} onClick={onSave} disabled={disabled}>
        <span>{disabled ? 'Guardando...' : 'Guardar'}</span>
        <FiSave />
      </button>
    </div>
  )
}

/* ------------------------------ QR Modal --------------------------------- */

type QrPrintModalProps = {
  open: boolean
  value: string
  onClose: () => void
}

function QrPrintModal({ open, value, onClose }: QrPrintModalProps): JSX.Element | null {
  const qrRef = useRef<HTMLDivElement | null>(null)

  if (!open) return null

  function handlePrint(): void {
    const node = qrRef.current
    if (!node) return

    const printWindow = window.open('', '_blank', 'width=520,height=700')
    if (!printWindow) return

    const qrMarkup = node.innerHTML

    printWindow.document.open()
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Imprimir QR</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; }
            .wrap { display: grid; place-items: center; gap: 12px; }
            .code { font-size: 16px; font-weight: 600; letter-spacing: 0.08em; }
          </style>
        </head>
        <body>
          <div class="wrap">
            ${qrMarkup}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()

    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  return createPortal(
    <ModalShell onClose={onClose}>
      <div className={styles.modal}>
        <ModalHeader title="QR del Producto" onClose={onClose} />

        <div className={styles.body}>
          <div style={{ display: 'grid', gap: 12, justifyItems: 'center', padding: 16 }}>
            <div ref={qrRef} style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
              <QRCodeSVG value={value} size={220} includeMargin />
              <div className="code" style={{ fontWeight: 600, letterSpacing: '0.08em' }}>
                {value}
              </div>
            </div>

            <button className={styles.saveBtn} type="button" onClick={handlePrint}>
              <span>Imprimir</span>
              <FiPrinter />
            </button>
          </div>
        </div>
      </div>
    </ModalShell>,
    document.body
  )
}

/* ------------------------------ Form Block ------------------------------- */

type ProductFormProps = {
  form: FormState
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  onGenerateCode: () => void
  onGenerateQr: () => void
  onBuyPriceChange: (value: string) => void
  onSellPriceChange: (value: string) => void
  onProfitPctChange: (value: string) => void
}

function ProductForm({
  form,
  setField,
  onGenerateCode,
  onGenerateQr,
  onBuyPriceChange,
  onSellPriceChange,
  onProfitPctChange
}: ProductFormProps): JSX.Element {
  return (
    <div className={styles.form}>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label}>Código de Producto</label>

          <div className={styles.codeWrap}>
            <input
              className={styles.input}
              value={form.code}
              onChange={(e) => setField('code', e.target.value)}
              placeholder=""
            />

            <div className={styles.codeActions}>
              <button
                className={styles.iconBtn}
                type="button"
                aria-label="Generar código"
                onClick={onGenerateCode}
              >
                <CiBarcode />
              </button>

              <button
                className={styles.iconBtn}
                type="button"
                aria-label="Generar QR"
                onClick={onGenerateQr}
              >
                <MdOutlineQrCode2 />
              </button>

              <button className={styles.iconBtn} type="button" aria-label="Ayuda">
                <FiHelpCircle />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Nombre del Producto</label>
          <input
            className={styles.input}
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder=""
          />
        </div>
      </div>

      <div className={styles.row4}>
        <div className={styles.field}>
          <label className={styles.label}>Stock Mínimo</label>
          <input
            className={styles.input}
            value={form.stockMin}
            onChange={(e) => setField('stockMin', e.target.value)}
            inputMode="numeric"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Stock Máximo</label>
          <input
            className={styles.input}
            value={form.stockMax}
            onChange={(e) => setField('stockMax', e.target.value)}
            inputMode="numeric"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Precio Compra</label>
          <input
            className={styles.input}
            value={form.buyPrice}
            onChange={(e) => onBuyPriceChange(e.target.value)}
            inputMode="decimal"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Precio Venta</label>
          <input
            className={styles.input}
            value={form.sellPrice}
            onChange={(e) => onSellPriceChange(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>

      <div className={styles.row4}>
        <div className={styles.field}>
          <label className={styles.label}>Stock</label>
          <input
            className={styles.input}
            value={form.stock}
            onChange={(e) => setField('stock', e.target.value)}
            inputMode="numeric"
          />
        </div>

        <div />
        <div />

        <div className={styles.field}>
          <label className={styles.label}>Porcentaje de ganancia</label>
          <input
            className={styles.input}
            value={form.profitPct}
            onChange={(e) => onProfitPctChange(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Image Block ------------------------------- */

type ImagePanelProps = {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  previewUrl: string | null
  onPickImage: () => void
  onFileSelected: (file: File | null) => void
  onClearImage: () => void
}

function ImagePanel({
  fileInputRef,
  previewUrl,
  onPickImage,
  onFileSelected,
  onClearImage
}: ImagePanelProps): JSX.Element {
  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0] ?? null
    onFileSelected(file)
    e.currentTarget.value = ''
  }

  return (
    <div className={styles.imagePanel}>
      <div className={styles.imageTitle}>Imagen del producto</div>

      <button className={styles.imageBox} type="button" onClick={onPickImage}>
        {previewUrl ? (
          <>
            <img
              className={styles.imagePreview}
              src={previewUrl}
              alt="Vista previa del producto"
              draggable={false}
            />
            <span className={styles.imageOverlay}>Cambiar imagen</span>
          </>
        ) : (
          <>
            <span>Agregar imagen</span>
            <FiImage />
          </>
        )}
      </button>

      {previewUrl ? (
        <button className={styles.clearImageBtn} type="button" onClick={onClearImage}>
          Quitar imagen
        </button>
      ) : null}

      <input
        ref={fileInputRef}
        className={styles.hiddenFile}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  )
}

/* ---------------------------- Main Component ----------------------------- */

export default function AddProductModal({ open, onClose }: Props): JSX.Element | null {
  const [form, setForm] = useState<FormState>(initialState)

  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrValue, setQrValue] = useState('')

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  const [priceEditMode, setPriceEditMode] = useState<PriceEditMode>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  function clearImage(): void {
    setImageFile(null)
    setImagePreviewUrl(null)
  }

  const closeAll = useCallback(() => {
    setQrModalOpen(false)
    clearImage()
    onClose()
  }, [onClose])

  const handleEscapeClose = useCallback(() => {
    if (qrModalOpen) {
      setQrModalOpen(false)
      return
    }
    closeAll()
  }, [qrModalOpen, closeAll])

  useEscapeToClose(open, handleEscapeClose)

  if (!open) return null

  function setField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function ensureProductCode(): string {
    const current = form.code.trim()
    if (current) return current

    const next = generate8DigitCode()
    setField('code', next)
    return next
  }

  function handleGenerateCode(): void {
    setField('code', generate8DigitCode())
  }

  function handleGenerateQr(): void {
    const code = ensureProductCode()
    setQrValue(code)
    setQrModalOpen(true)
  }

  function handlePickImage(): void {
    fileInputRef.current?.click()
  }

  function handleImageSelected(file: File | null): void {
    if (!file) {
      clearImage()
      return
    }

    if (!file.type.startsWith('image/')) return

    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
  }

  function handleSellPriceChange(value: string): void {
    setPriceEditMode('sell')
    setField('sellPrice', value)

    if (!value.trim()) {
      setField('profitPct', '')
      return
    }

    const buy = parseDecimal(form.buyPrice)
    const sell = parseDecimal(value)
    if (buy === null || sell === null) return

    const pct = computeProfitPct(buy, sell)
    if (pct === null) return

    setField('profitPct', formatNumber(pct, 2))
  }

  function handleProfitPctChange(value: string): void {
    setPriceEditMode('pct')
    setField('profitPct', value)

    const pct = parseDecimal(value)
    if (pct === null) return

    const buy = parseDecimal(form.buyPrice)
    if (buy === null) return

    const sell = computeSellPrice(buy, pct)
    if (sell === null) return

    setField('sellPrice', formatNumber(sell, 2))
  }

  function handleBuyPriceChange(value: string): void {
    setField('buyPrice', value)

    const buy = parseDecimal(value)
    if (buy === null) return

    if (priceEditMode === 'pct') {
      const pct = parseDecimal(form.profitPct)
      if (pct === null) return

      const sell = computeSellPrice(buy, pct)
      if (sell === null) return

      setField('sellPrice', formatNumber(sell, 2))
      return
    }

    if (priceEditMode === 'sell') {
      const sell = parseDecimal(form.sellPrice)
      if (sell === null) return

      const pct = computeProfitPct(buy, sell)
      if (pct === null) return

      setField('profitPct', formatNumber(pct, 2))
    }
  }

  async function handleSave(): Promise<void> {
    if (isSaving) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const payload = await buildCreateProductPayload(form, imageFile)

      if (!payload.sku) throw new Error('Falta el código del producto')
      if (!payload.name) throw new Error('Falta el nombre del producto')

      await productRepository.create(payload)

      closeAll()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar el producto'
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <>
      <ModalShell onClose={closeAll}>
        <div className={styles.modal}>
          <ModalHeader title="Agregar Producto" onClose={closeAll} />

          <div className={styles.body}>
            <div className={styles.contentGrid}>
              <ProductForm
                form={form}
                setField={setField}
                onGenerateCode={handleGenerateCode}
                onGenerateQr={handleGenerateQr}
                onBuyPriceChange={handleBuyPriceChange}
                onSellPriceChange={handleSellPriceChange}
                onProfitPctChange={handleProfitPctChange}
              />

              <ImagePanel
                fileInputRef={fileInputRef}
                previewUrl={imagePreviewUrl}
                onPickImage={handlePickImage}
                onFileSelected={handleImageSelected}
                onClearImage={clearImage}
              />
            </div>

            {saveError ? (
              <div style={{ padding: '0 16px', marginTop: 10, color: 'crimson' }}>{saveError}</div>
            ) : null}

            <SaveFooter onSave={handleSave} disabled={isSaving} />
          </div>
        </div>
      </ModalShell>

      <QrPrintModal open={qrModalOpen} value={qrValue} onClose={() => setQrModalOpen(false)} />
    </>,
    document.body
  )
}
