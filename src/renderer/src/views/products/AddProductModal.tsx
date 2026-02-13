import { useEffect, useRef, useState, type JSX, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiSave, FiImage, FiHelpCircle } from 'react-icons/fi'
import { MdOutlineQrCode2 } from 'react-icons/md'
import { CiBarcode } from 'react-icons/ci'
import styles from './AddProductModal.module.css'

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

// ==============================
// Hooks (comportamiento del modal)
// ==============================
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

// ==============================
// UI Helpers (bloques reutilizables)
// ==============================
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
  onSave: () => void
}

function SaveFooter({ onSave }: SaveFooterProps): JSX.Element {
  return (
    <div className={styles.footer}>
      <button className={styles.saveBtn} onClick={onSave}>
        <span>Guardar</span>
        <FiSave />
      </button>
    </div>
  )
}

// ==============================
// Form Section
// ==============================
type ProductFormProps = {
  form: FormState
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
}

function ProductForm({ form, setField }: ProductFormProps): JSX.Element {
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
              <button className={styles.iconBtn} type="button" aria-label="Generar/Buscar código">
                <CiBarcode />
              </button>
              <button className={styles.iconBtn} type="button" aria-label="Escanear código">
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
            onChange={(e) => setField('buyPrice', e.target.value)}
            inputMode="decimal"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Precio Venta</label>
          <input
            className={styles.input}
            value={form.sellPrice}
            onChange={(e) => setField('sellPrice', e.target.value)}
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
            onChange={(e) => setField('profitPct', e.target.value)}
            inputMode="decimal"
          />
        </div>
      </div>
    </div>
  )
}

// ==============================
// Image Panel Section
// ==============================
type ImagePanelProps = {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onPickImage: () => void
}

function ImagePanel({ fileInputRef, onPickImage }: ImagePanelProps): JSX.Element {
  return (
    <div className={styles.imagePanel}>
      <div className={styles.imageTitle}>Imagen del producto</div>

      <button className={styles.imageBox} type="button" onClick={onPickImage}>
        <span>Agregar imagen</span>
        <FiImage />
      </button>

      <input
        ref={fileInputRef}
        className={styles.hiddenFile}
        type="file"
        accept="image/*"
        onChange={() => undefined}
      />
    </div>
  )
}

// ==============================
// Main Component
// ==============================
export default function AddProductModal({ open, onClose }: Props): JSX.Element | null {
  const [form, setForm] = useState<FormState>(initialState)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEscapeToClose(open, onClose)

  if (!open) return null

  function setField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handlePickImage(): void {
    fileInputRef.current?.click()
  }

  function handleSave(): void {
    // TODO: funcionalidad después (validaciones + IPC create)
    onClose()
  }

  return createPortal(
    <ModalShell onClose={onClose}>
      <div className={styles.modal}>
        <ModalHeader title="Agregar Producto" onClose={onClose} />

        <div className={styles.body}>
          <div className={styles.contentGrid}>
            <ProductForm form={form} setField={setField} />
            <ImagePanel fileInputRef={fileInputRef} onPickImage={handlePickImage} />
          </div>

          <SaveFooter onSave={handleSave} />
        </div>
      </div>
    </ModalShell>,
    document.body
  )
}
