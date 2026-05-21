import Sidebar from '../dashboard/Sidebar'
import styles from '../dashboard/dashboard.module.css'

export default function SoloIALayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        {children}
      </div>
    </div>
  )
}