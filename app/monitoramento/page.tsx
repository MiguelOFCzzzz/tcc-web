'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Chart from 'chart.js/auto'
import styles from './monitoramento.module.css'

interface SensorData {
  umidade: number | null
  temperatura: number | null
  created_at: string | null
}

interface ClimaDados {
  temperatura: number | null
  vento: number | null
  hora: string | null
}

interface HistoricoItem {
  umidade: number
  temperatura: number | null
  created_at: string
}

type StatusSensor = 'seco' | 'ideal' | 'umido' | 'offline'

function utcToBRT(utcString: string): Date {
  const d = new Date(utcString)
  return new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
}

function formatHHMM(utcString: string): string {
  const d = utcToBRT(utcString)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function getStatusFromUmidade(u: number | null): StatusSensor {
  if (u === null) return 'offline'
  if (u <= 30) return 'seco'
  if (u <= 60) return 'ideal'
  return 'umido'
}

function getRecomendacao(umidade: number | null, temperatura: number | null, vento: number | null) {
  if (umidade === null) {
    return {
      icon: '📡',
      titulo: 'Aguardando dados do sensor',
      descricao: 'Sem leitura disponível no momento.',
      cor: '#9e9e9e',
      bg: 'rgba(158,158,158,0.08)',
    }
  }
  const temp = temperatura ?? 0
  const wind = vento ?? 0

  if (umidade <= 30 && temp > 28) {
    return {
      icon: '🚨',
      titulo: 'Irrigação urgente',
      descricao: 'Solo seco com calor intenso. Irrigue imediatamente para evitar danos à cultura.',
      cor: '#d21717',
      bg: 'rgba(210,23,23,0.08)',
    }
  }
  if (umidade <= 30) {
    return {
      icon: '💧',
      titulo: 'Irrigar em breve',
      descricao: 'Solo seco. Programe a irrigação nas próximas horas.',
      cor: '#E3A330',
      bg: 'rgba(227,163,48,0.08)',
    }
  }
  if (umidade <= 60) {
    return {
      icon: '✅',
      titulo: 'Manter',
      descricao: 'Solo em condição ideal. Continue o manejo atual.',
      cor: '#4CAF50',
      bg: 'rgba(76,175,80,0.08)',
    }
  }
  if (wind > 5) {
    return {
      icon: '🌬️',
      titulo: 'Aguardar',
      descricao: 'Solo úmido. O vento ajudará na evaporação — observe nas próximas horas.',
      cor: '#0277BD',
      bg: 'rgba(2,119,189,0.08)',
    }
  }
  return {
    icon: '🚿',
    titulo: 'Reduzir irrigação',
    descricao: 'Solo muito úmido. Suspenda a irrigação até normalizar.',
    cor: '#0277BD',
    bg: 'rgba(2,119,189,0.08)',
  }
}

const statusMap = {
  seco: { label: 'Seco', color: '#d21717', bg: 'rgba(210,23,23,0.08)' },
  ideal: { label: 'Ideal', color: '#4CAF50', bg: 'rgba(76,175,80,0.08)' },
  umido: { label: 'Úmido', color: '#0277BD', bg: 'rgba(2,119,189,0.08)' },
  offline: { label: 'Sem dados', color: '#9e9e9e', bg: 'rgba(158,158,158,0.08)' },
}

export default function MonitoramentoPage() {
  // Canvas refs
  const linhaRef = useRef<HTMLCanvasElement>(null)
  const barrasRef = useRef<HTMLCanvasElement>(null)
  const donutRef = useRef<HTMLCanvasElement>(null)

  // Chart instance refs
  const chartLinhaRef = useRef<Chart | null>(null)
  const chartBarrasRef = useRef<Chart | null>(null)
  const chartDonutRef = useRef<Chart | null>(null)

  // State
  const [sensor, setSensor] = useState<SensorData>({ umidade: null, temperatura: null, created_at: null })
  const [clima, setClima] = useState<ClimaDados>({ temperatura: null, vento: null, hora: null })
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [status, setStatus] = useState<StatusSensor>('offline')

  const gridColor = 'rgba(42,61,29,0.06)'
  const tickStyle = { color: '#7a7260', font: { family: 'Poppins' as const, size: 11 } }

  const destroyCharts = useCallback(() => {
    chartLinhaRef.current?.destroy()
    chartBarrasRef.current?.destroy()
    chartDonutRef.current?.destroy()
    chartLinhaRef.current = null
    chartBarrasRef.current = null
    chartDonutRef.current = null
  }, [])

  const buildCharts = useCallback((hist: HistoricoItem[], umidadeAtual: number | null) => {
    destroyCharts()

    // --- Gráfico de Linha: histórico de umidade ---
    if (linhaRef.current) {
      const sorted = [...hist].reverse()
      const labels = sorted.map(h => formatHHMM(h.created_at))
      const dataUmidade = sorted.map(h => h.umidade)

      chartLinhaRef.current = new Chart(linhaRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Umidade (%)',
            data: dataUmidade,
            borderColor: '#0277BD',
            backgroundColor: 'rgba(2,119,189,0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#0277BD',
            pointBorderWidth: 2,
            pointRadius: 4,
            tension: 0.4,
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
            },
          },
          scales: {
            y: {
              grid: { color: gridColor },
              ticks: { ...tickStyle, callback: (v) => `${v}%` },
              border: { display: false },
              min: 0,
              max: 100,
            },
            x: {
              grid: { display: false },
              ticks: tickStyle,
              border: { display: false },
            },
          },
        },
      })
    }

    // --- Gráfico de Barras: faixas de umidade ---
    if (barrasRef.current) {
      const seco = hist.filter(h => h.umidade <= 30).length
      const ideal = hist.filter(h => h.umidade > 30 && h.umidade <= 60).length
      const umido = hist.filter(h => h.umidade > 60).length

      chartBarrasRef.current = new Chart(barrasRef.current, {
        type: 'bar',
        data: {
          labels: ['Seco (≤30%)', 'Ideal (31–60%)', 'Úmido (>60%)'],
          datasets: [{
            label: 'Leituras',
            data: [seco, ideal, umido],
            backgroundColor: ['rgba(210,23,23,0.85)', 'rgba(76,175,80,0.85)', 'rgba(2,119,189,0.85)'],
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
            },
          },
          scales: {
            y: {
              grid: { color: gridColor },
              ticks: tickStyle,
              border: { display: false },
            },
            x: {
              grid: { display: false },
              ticks: tickStyle,
              border: { display: false },
            },
          },
        },
      })
    }

    // --- Gráfico Donut: situação atual ---
    if (donutRef.current) {
      let seco = 0, ideal = 0, umido = 0
      if (umidadeAtual !== null) {
        if (umidadeAtual <= 30) {
          seco = Math.max(0, 30 - umidadeAtual)
          ideal = umidadeAtual
        } else if (umidadeAtual <= 60) {
          ideal = umidadeAtual
          umido = 100 - umidadeAtual
        } else {
          ideal = 100 - umidadeAtual
          umido = umidadeAtual
        }
      }

      chartDonutRef.current = new Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Seco', 'Ideal', 'Úmido'],
          datasets: [{
            data: umidadeAtual !== null ? [seco, ideal, umido] : [33, 33, 34],
            backgroundColor: [
              'rgba(210,23,23,0.85)',
              'rgba(76,175,80,0.85)',
              'rgba(2,119,189,0.85)',
            ],
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
  }, [destroyCharts])

  const fetchAll = useCallback(async () => {
    const token = localStorage.getItem('token')
    const headers: HeadersInit = { Authorization: `Bearer ${token}` }

    try {
      // Sensor atual
      const resSensor = await fetch('/api/sensor', { headers })
      if (resSensor.ok) {
        const dataSensor = await resSensor.json()
        const received = dataSensor.data ?? dataSensor.recebido ?? dataSensor
        const u = received?.umidade ?? null
        const t = received?.temperatura ?? null
        const ca = received?.created_at ?? null
        setSensor({ umidade: u, temperatura: t, created_at: ca })
        setStatus(getStatusFromUmidade(u))
      } else {
        setSensor({ umidade: null, temperatura: null, created_at: null })
        setStatus('offline')
      }
    } catch {
      setSensor({ umidade: null, temperatura: null, created_at: null })
      setStatus('offline')
    }

    try {
      // Histórico
      const resHist = await fetch('/api/sensor/historico', { headers })
      if (resHist.ok) {
        const dataHist = await resHist.json()
        const hist: HistoricoItem[] = dataHist.historico ?? []
        setHistorico(hist)
      }
    } catch {
      // keep previous
    }

    try {
      // Clima
      const resClima = await fetch('/api/clima?lat=-21.7495&lon=-50.3342', { headers })
      if (resClima.ok) {
        const dataClima = await resClima.json()
        const atual = dataClima.atual ?? {}
        setClima({
          temperatura: atual.temperatura ?? null,
          vento: atual.vento ?? null,
          hora: atual.hora ?? null,
        })
      }
    } catch {
      // keep previous
    }
  }, [])

  // Rebuild charts whenever data changes
  useEffect(() => {
    buildCharts(historico, sensor.umidade)
  }, [historico, sensor.umidade, buildCharts])

  // Fetch on mount + every 5s
  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 5000)
    return () => {
      clearInterval(interval)
      destroyCharts()
    }
  }, [fetchAll, destroyCharts])

  const st = statusMap[status]
  const recomendacao = getRecomendacao(sensor.umidade, sensor.temperatura ?? clima.temperatura, clima.vento)

  return (
    <div className={styles.page}>

      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1>Monitoramento</h1>
          <p>Análise térmica e umidade do solo em tempo real</p>
        </div>
        <div
          className={styles.statusBadge}
          style={{ color: st.color, background: st.bg, border: `1px solid ${st.color}30` }}
        >
          <span className={styles.statusDot} style={{ background: st.color }} />
          Umidade: {sensor.umidade !== null ? `${sensor.umidade}%` : '--'} — {st.label}
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpiRow}>
        <div className={styles.kpi}>
          <span className={styles.kpiIcon}>💧</span>
          <div>
            <span className={styles.kpiVal}>{sensor.umidade !== null ? `${sensor.umidade}%` : '--'}</span>
            <span className={styles.kpiLabel}>Umidade do solo</span>
          </div>
        </div>

        <div className={styles.kpi}>
          <span className={styles.kpiIcon}>🌡️</span>
          <div>
            <span className={styles.kpiVal}>{sensor.temperatura !== null ? `${sensor.temperatura}°C` : '--'}</span>
            <span className={styles.kpiLabel}>Temp. do sensor</span>
          </div>
        </div>

        <div className={styles.kpi}>
          <span className={styles.kpiIcon}>☁️</span>
          <div>
            <span className={styles.kpiVal}>{clima.temperatura !== null ? `${clima.temperatura}°C` : '--'}</span>
            <span className={styles.kpiLabel}>Temp. do clima</span>
          </div>
        </div>

        <div className={styles.kpi}>
          <span className={styles.kpiIcon}>📡</span>
          <div>
            <span
              className={styles.kpiVal}
              style={{ color: sensor.umidade !== null ? '#4CAF50' : '#9e9e9e' }}
            >
              {sensor.umidade !== null ? 'Online' : 'Aguardando'}
            </span>
            <span className={styles.kpiLabel}>Sensor ESP32</span>
          </div>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className={styles.grid}>

        {/* Linha — histórico umidade */}
        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHead}>
            <h3>Histórico de Umidade</h3>
            <span className={styles.cardTag}>
              {historico.length > 0 ? `${historico.length} leituras` : 'Sem dados'}
            </span>
          </div>
          <canvas ref={linhaRef} />
        </div>

        {/* Barras — faixas */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Faixas de Umidade</h3>
            <span className={styles.cardTag}>Distribuição</span>
          </div>
          <canvas ref={barrasRef} />
        </div>

        {/* Donut — situação atual */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Situação Atual</h3>
            <span className={styles.cardTag}>% relativo</span>
          </div>
          <canvas ref={donutRef} />
        </div>

        {/* Recomendação de irrigação — CSS puro */}
        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHead}>
            <h3>Recomendação de Irrigação</h3>
            <span className={styles.cardTag}>IA Solo</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            padding: '16px',
            borderRadius: '12px',
            background: recomendacao.bg,
            border: `1.5px solid ${recomendacao.cor}25`,
            marginTop: '4px',
          }}>
            {/* Ícone grande */}
            <div style={{
              fontSize: '52px',
              lineHeight: 1,
              flexShrink: 0,
              width: '72px',
              height: '72px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(42,61,29,0.1)',
            }}>
              {recomendacao.icon}
            </div>

            {/* Texto */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 700,
                color: recomendacao.cor,
                marginBottom: '6px',
                letterSpacing: '-0.3px',
              }}>
                {recomendacao.titulo}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>
                {recomendacao.descricao}
              </div>

              {/* Métricas usadas */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Umidade', value: sensor.umidade !== null ? `${sensor.umidade}%` : '--', icon: '💧' },
                  {
                    label: 'Temperatura',
                    value: (sensor.temperatura ?? clima.temperatura) !== null
                      ? `${sensor.temperatura ?? clima.temperatura}°C`
                      : '--',
                    icon: '🌡️'
                  },
                  { label: 'Vento', value: clima.vento !== null ? `${clima.vento} m/s` : '--', icon: '💨' },
                ].map(m => (
                  <div key={m.label} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    background: '#fff',
                    borderRadius: '100px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    boxShadow: '0 1px 4px rgba(42,61,29,0.08)',
                  }}>
                    <span>{m.icon}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{m.label}:</span>
                    <span>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}