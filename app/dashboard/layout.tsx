import type { Metadata } from 'next'
import Sidebar from './Sidebar'
import styles from './dashboard.module.css'

export const metadata: Metadata = {
  title: 'Dashboard — SoloSmart',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        {children}
      </div>
    </div>
  )
}