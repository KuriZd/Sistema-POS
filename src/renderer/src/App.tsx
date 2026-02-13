// src/renderer/src/App.tsx
import { useEffect, useState } from 'react'
import type { JSX } from 'react'

import LoginView from './views/LoginView'
import PosView from './views/PosView'
import ProductsView from './views/products/ProductsView'
import ReportsView from './views/ReportsView'

import AppLayout from './components/layout/AppLayout'
import type { SidebarItemKey } from './components/layout/Sidebar'

import iconProducts from './assets/Products.png'
import iconPos from './assets/pos.png'
import iconReports from './assets/reports.png'
import iconBell from './assets/bell.png'
import iconLogout from './assets/Logout.png'
import iconLogo from './assets/Logo.png'

type AuthUser = { id: number; name: string; role: string }

export default function App(): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [active, setActive] = useState<SidebarItemKey>('inventory')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const me = await window.pos.auth.me()
      setUser(me)
      setLoading(false)
    })()
  }, [])

  if (loading) return <div style={{ padding: 16 }}>Cargando...</div>
  if (!user) return <LoginView onLoggedIn={setUser} />

  return (
    <AppLayout
      activeKey={active}
      onNavigate={setActive}
      onLogout={() => {
        void (async () => {
          await window.pos.auth.logout()
          setUser(null)
        })()
      }}
      icons={{
        products: iconProducts,
        inventory: iconPos,
        sales: iconReports,
        logout: iconLogout,
        bell: iconBell,
        logo: iconLogo
      }}
    >
      {active === 'inventory' && <PosView />}
      {active === 'products' && <ProductsView />}
      {active === 'sales' && <ReportsView />}
    </AppLayout>
  )
}
