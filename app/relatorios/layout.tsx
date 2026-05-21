import Sidebar from '../dashboard/Sidebar'
import styles from '../dashboard/dashboard.module.css'

export default function SoloChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}