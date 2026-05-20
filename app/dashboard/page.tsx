'use client'

import styles from './dashboard.module.css'

export default function DashboardPage() {
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Dashboard</h1>
        <p>Visão geral do monitoramento do solo</p>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Umidade do Solo</div>
          <div className={styles.cardValue}>
            --<span className={styles.cardUnit}>%</span>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Temperatura</div>
          <div className={styles.cardValue}>
            --<span className={styles.cardUnit}>°C</span>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>pH do Solo</div>
          <div className={styles.cardValue}>--</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Última Leitura</div>
          <div className={styles.cardValue} style={{ fontSize: '18px' }}>--</div>
        </div>
      </div>
    </div>
  )
}