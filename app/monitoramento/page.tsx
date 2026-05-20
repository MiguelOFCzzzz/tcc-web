'use client'

import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import styles from './monitoramento.module.css'

export default function MonitoramentoPage() {
  const tempLinhaRef = useRef<HTMLCanvasElement>(null)
  const tempFaixaRef = useRef<HTMLCanvasElement>(null)
  const umidadeSoloRef = useRef<HTMLCanvasElement>(null)

  const chartLinhaRef = useRef<Chart | null>(null)
  const chartFaixaRef = useRef<Chart | null>(null)
  const chartDonutRef = useRef<Chart | null>(null)

  const [umidade, setUmidade] = useState<number | null>(null)
  const [status, setStatus] = useState<'seco' | 'ideal' | 'umido'>('ideal')

  useEffect(() => {
    const token = localStorage.getItem('token')

    async function fetchAndRender() {
      let umidadeVal = 45

      try {
        const res = await fetch('/api/sensor', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (typeof data.umidade === 'number') umidadeVal = data.umidade
        }
      } catch {
        // usa mock
      }

      setUmidade(umidadeVal)
      setStatus(umidadeVal <= 30 ? 'seco' : umidadeVal <= 60 ? 'ideal' : 'umido')

      let seco = 0, ideal = 0, umido = 0
      if (umidadeVal <= 30) {
        seco = 100 - umidadeVal; ideal = umidadeVal; umido = 0
      } else if (umidadeVal <= 60) {
        seco = 0; ideal = umidadeVal; umido = 100 - umidadeVal
      } else {
        seco = 0; ideal = 100 - umidadeVal; umido = umidadeVal
      }

      chartLinhaRef.current?.destroy()
      chartFaixaRef.current?.destroy()
      chartDonutRef.current?.destroy()

      const gridColor = 'rgba(42,61,29,0.06)'
      const tickStyle = { color: '#7a7260', font: { family: 'Poppins' as const, size: 11 } }

      if (tempLinhaRef.current) {
        chartLinhaRef.current = new Chart(tempLinhaRef.current, {
          type: 'line',
          data: {
            labels: ['10h', '12h', '14h', '16h', '18h'],
            datasets: [{
              label: 'Temperatura (°C)',
              data: [18, 21, 24, 22, 19],
              borderColor: '#C56D47',
              backgroundColor: 'rgba(197,109,71,0.08)',
              borderWidth: 2.5,
              pointBackgroundColor: '#fff',
              pointBorderColor: '#C56D47',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
              tension: 0.45,
              fill: true,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#2A3D1D',
                titleColor: '#fff',
                bodyColor: 'rgba(255,255,255,0.75)',
                padding: 10,
                cornerRadius: 8,
                callbacks: { label: ctx => ` ${ctx.parsed.y}°C` },
              },
            },
            scales: {
              y: { grid: { color: gridColor }, ticks: tickStyle, border: { display: false } },
              x: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
            },
          },
        })
      }

      if (tempFaixaRef.current) {
        chartFaixaRef.current = new Chart(tempFaixaRef.current, {
          type: 'bar',
          data: {
            labels: ['< 20°C', '20–30°C', '> 30°C'],
            datasets: [{
              label: 'Horas',
              data: [3, 6, 1],
              backgroundColor: ['rgba(48,118,189,0.85)', 'rgba(80,140,83,0.85)', 'rgba(166,70,70,0.85)'],
              borderRadius: 8,
              borderSkipped: false,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#2A3D1D',
                titleColor: '#fff',
                bodyColor: 'rgba(255,255,255,0.75)',
                padding: 10,
                cornerRadius: 8,
                callbacks: { label: ctx => ` ${ctx.parsed.y}h` },
              },
            },
            scales: {
              y: { grid: { color: gridColor }, ticks: tickStyle, border: { display: false } },
              x: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
            },
          },
        })
      }

      if (umidadeSoloRef.current) {
        chartDonutRef.current = new Chart(umidadeSoloRef.current, {
          type: 'doughnut',
          data: {
            labels: ['Seco', 'Ideal', 'Úmido'],
            datasets: [{
              data: [seco, ideal, umido],
              backgroundColor: ['rgba(210,23,23,0.85)', 'rgba(76,175,80,0.85)', 'rgba(2,119,189,0.85)'],
              borderWidth: 3,
              borderColor: '#fff',
              hoverOffset: 8,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '72%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#1a2510',
                  font: { family: 'Poppins', size: 12 },
                  padding: 20,
                  usePointStyle: true,
                  pointStyleWidth: 8,
                },
              },
              tooltip: {
                backgroundColor: '#2A3D1D',
                titleColor: '#fff',
                bodyColor: 'rgba(255,255,255,0.75)',
                padding: 10,
                cornerRadius: 8,
              },
            },
          },
        })
      }
    }

    fetchAndRender()

    return () => {
      chartLinhaRef.current?.destroy()
      chartFaixaRef.current?.destroy()
      chartDonutRef.current?.destroy()
    }
  }, [])

  const statusMap = {
    seco:  { label: 'Seco',  color: '#d21717', bg: 'rgba(210,23,23,0.08)' },
    ideal: { label: 'Ideal', color: '#4CAF50', bg: 'rgba(76,175,80,0.08)' },
    umido: { label: 'Úmido', color: '#0277BD', bg: 'rgba(2,119,189,0.08)' },
  }
  const st = statusMap[status]

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>Monitoramento</h1>
          <p>Análise térmica e umidade do solo em tempo real</p>
        </div>
        <div className={styles.statusBadge} style={{ color: st.color, background: st.bg, border: `1px solid ${st.color}30` }}>
          <span className={styles.statusDot} style={{ background: st.color }} />
          Umidade: {umidade !== null ? `${umidade}%` : '--'} — {st.label}
        </div>
      </div>

      {/* KPI row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpi}>
          <span className={styles.kpiIcon}>🌡️</span>
          <div>
            <span className={styles.kpiVal}>24°C</span>
            <span className={styles.kpiLabel}>Pico do dia</span>
          </div>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiIcon}>💧</span>
          <div>
            <span className={styles.kpiVal}>{umidade !== null ? `${umidade}%` : '--'}</span>
            <span className={styles.kpiLabel}>Umidade atual</span>
          </div>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiIcon}>⏱️</span>
          <div>
            <span className={styles.kpiVal}>5 min</span>
            <span className={styles.kpiLabel}>Última leitura</span>
          </div>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiIcon}>📡</span>
          <div>
            <span className={styles.kpiVal} style={{ color: '#4CAF50' }}>Online</span>
            <span className={styles.kpiLabel}>Sensor ESP32</span>
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className={styles.grid}>
        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHead}>
            <h3>Temperatura ao Longo do Dia</h3>
            <span className={styles.cardTag}>Hoje</span>
          </div>
          <canvas ref={tempLinhaRef} />
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Faixas de Temperatura</h3>
            <span className={styles.cardTag}>Horas</span>
          </div>
          <canvas ref={tempFaixaRef} />
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Umidade do Solo</h3>
            <span className={styles.cardTag}>% relativo</span>
          </div>
          <canvas ref={umidadeSoloRef} />
        </div>
      </div>
    </div>
  )
}