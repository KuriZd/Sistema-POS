import { useMemo, useState } from 'react'
import Sidebar, { SidebarItemKey } from './Sidebar'
import TopNav from './TopNav'
import styles from './AppLayout.module.css'
import type { JSX } from 'react'

type Props = {
  activeKey: SidebarItemKey
  onNavigate: (key: SidebarItemKey) => void
  onLogout: () => void
  children: React.ReactNode
  icons: {
    products: string
    inventory: string
    sales: string
    logout: string
    bell: string
    logo: string
  }
}

export default function AppLayout({
  activeKey,
  onNavigate,
  onLogout,
  children,
  icons
}: Props): JSX.Element {
  const [collapsed, setCollapsed] = useState(false)

  const items = useMemo(
    () => [
      { key: 'products' as const, label: 'Productos', iconSrc: icons.products },
      { key: 'inventory' as const, label: 'Inventario', iconSrc: icons.inventory },
      { key: 'sales' as const, label: 'Ventas', iconSrc: icons.sales }
    ],
    [icons.products, icons.inventory, icons.sales]
  )

  const title = useMemo(() => {
    const map: Record<SidebarItemKey, string> = {
      products: 'Productos',
      inventory: 'Inventario',
      sales: 'Ventas'
    }
    return map[activeKey]
  }, [activeKey])

  return (
    <div className={styles.shell}>
      <Sidebar
        collapsed={collapsed}
        activeKey={activeKey}
        items={items}
        onToggle={() => setCollapsed((v) => !v)}
        onSelect={onNavigate}
        onLogout={onLogout}
        logoutIconSrc={icons.logout}
        logoSrc={icons.logo}
      />

      <div className={styles.main}>
        <TopNav title={title} bellIconSrc={icons.bell} />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
