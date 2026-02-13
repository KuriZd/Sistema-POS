// src/renderer/src/components/layout/TopNav.tsx
import styles from './TopNav.module.css'
import type { JSX } from 'react'

type Props = {
  title: string
  bellIconSrc: string
  onBellClick?: () => void
}

export default function TopNav({ title, bellIconSrc, onBellClick }: Props): JSX.Element {
  return (
    <header className={styles.topnav}>
      <div className={styles.left}>
        <span className={styles.title}>{title}</span>
      </div>

      <div className={styles.right}>
        <button className={styles.iconButton} onClick={onBellClick} aria-label="Notificaciones">
          <img className={styles.iconImg} src={bellIconSrc} alt="" />
        </button>
      </div>
    </header>
  )
}
