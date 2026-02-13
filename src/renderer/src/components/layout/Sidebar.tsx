// src/renderer/src/components/layout/Sidebar.tsx
import styles from './Sidebar.module.css'
import type { JSX } from 'react'

export type SidebarItemKey = 'products' | 'inventory' | 'sales'

type SidebarItem = {
  key: SidebarItemKey
  label: string
  iconSrc: string
}

type Props = {
  collapsed: boolean
  activeKey: SidebarItemKey
  items: SidebarItem[]
  onToggle: () => void
  onSelect: (key: SidebarItemKey) => void
  onLogout: () => void
  logoutIconSrc: string
  logoSrc: string
}

export default function Sidebar({
  collapsed,
  activeKey,
  items,
  onToggle,
  onSelect,
  onLogout,
  logoutIconSrc,
  logoSrc
}: Props): JSX.Element {
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : styles.expanded}`}>
      {/* Header: hamburguesa (izq) + logo (der, solo expandida) */}
      <div className={styles.header}>
        <button className={styles.menuButton} onClick={onToggle} aria-label="Abrir/cerrar menú">
          <span className={styles.menuIcon}>
            <span />
          </span>
        </button>

        {!collapsed && <img className={styles.logo} src={logoSrc} alt="Logo" />}
      </div>

      {/* Opciones */}
      <nav className={styles.nav}>
        {items.map((item) => {
          const isActive = item.key === activeKey

          return (
            <button
              key={item.key}
              className={styles.item}
              onClick={() => onSelect(item.key)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
            >
              <span className={`${styles.iconWrap} ${isActive ? styles.iconWrapActive : ''}`}>
                <img className={styles.itemIcon} src={item.iconSrc} alt="" />
              </span>

              {!collapsed && <span className={styles.itemLabel}>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer: logout */}
      <div className={styles.footer}>
        <button
          className={styles.logout}
          onClick={onLogout}
          title={collapsed ? 'Salir' : undefined}
          aria-label="Salir"
        >
          <span className={styles.iconWrap}>
            <img className={styles.logoutIcon} src={logoutIconSrc} alt="" />
          </span>

          {!collapsed && <span className={styles.itemLabel}>Salir</span>}
        </button>
      </div>
    </aside>
  )
}
