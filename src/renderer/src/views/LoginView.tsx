import { useEffect, useRef, useState } from 'react'
import styles from './LoginView.module.css'
import logo from '../assets/logo.png'
import type { JSX } from 'react'

type AuthUser = {
  id: number
  name: string
  role: string
}

type Props = {
  onLoggedIn: (user: AuthUser) => void
}

export default function LoginView({ onLoggedIn }: Props): JSX.Element {
  const pinRef = useRef<HTMLInputElement>(null)

  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // UX: enfocar el input al abrir la pantalla
  useEffect(() => {
    pinRef.current?.focus()
  }, [])

  async function handleLogin(): Promise<void> {
    if (!pin.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await window.pos.auth.login(pin.trim())

      if (!result.ok) {
        setError(result.error)
        return
      }

      onLoggedIn(result.user)
    } catch {
      setError('Ocurrió un error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.logoWrap}>
          <img className={styles.logo} src={logo} alt="Logo" />
          <h1 className={styles.title}>Damian&apos;s stationery</h1>
        </div>

        <div className={styles.form}>
          <input
            className={styles.input}
            ref={pinRef}
            value={pin}
            type="password"
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleLogin()
            }}
            placeholder="PIN"
            inputMode="numeric"
          />

          <button
            className={styles.primaryBtn}
            disabled={loading}
            onClick={() => void handleLogin()}
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>

          {/* <div className={styles.linkRow}>
            <button className={styles.linkBtn} onClick={handleRegister}>
              Registrarse
            </button>
          </div> */}

          {/* <div className={styles.forgot}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                handleForgotPassword()
              }}
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div> */}

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>By KuriZd</div>
      </section>
    </div>
  )
}
