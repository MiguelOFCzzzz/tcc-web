'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import styles from './dashboard.module.css'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/monitoramento', label: 'Monitoramento', icon: '📈' },
  { href: '/soloia', label: 'Solo IA', icon: '🤖' },
]

const navBottom = [
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: '📄' },
  { href: '/dashboard/historico', label: 'Histórico', icon: '🕓' },
  { href: '/dashboard/zonas', label: 'Zonas do Solo', icon: '🗺️' },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  // Leitura do localStorage apenas no cliente, após montagem
  const [email, setEmail] = useState('')
  const [cidade, setCidade] = useState('')

  useEffect(() => {
    setEmail(localStorage.getItem('userEmail') || '')
    setCidade(localStorage.getItem('userCidade') || 'Brasil')
  }, [])

  function logout() {
    localStorage.clear()
    document.cookie = 'auth_token=; path=/; max-age=0'
    router.push('/login')
  }

  const initials = email ? email.slice(0, 2).toUpperCase() : 'SS'

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>
        <span className={styles.logoText}>Solo<em>Smart</em></span>
        <span className={styles.logoSub}>Plataforma Web</span>
      </div>

      <nav className={styles.nav}>
        <span className={styles.navSection}>Principal</span>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.navActive : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <span className={styles.navSection}>Análise</span>
        {navBottom.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.navActive : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.userBar}>
        <div className={styles.userAvatar}>{initials}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{email || 'Usuário'}</span>
          <span className={styles.userRole}>{cidade}</span>
        </div>
        <button className={styles.logoutBtn} onClick={logout} title="Sair">⏻</button>
      </div>
    </aside>
  )
}