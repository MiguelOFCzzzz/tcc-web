'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUserCoords } from '../hooks/useUserCoords'
import styles from './dashboard.module.css'

const API = 'http://localhost:3001'

interface SensorData {
  umidade: number
  temperatura: number | null
  created_at: string
}

interface ClimaData {
  temperatura: number
  vento: number
  hora: string
}

export default function DashboardPage() {
  const [sensor, setSensor] = useState<SensorData | null>(null)
  const [clima, setClima] = useState<ClimaData | null>(null)
  const [ultimaLeitura, setUltimaLeitura] = useState<string>('--')
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const coords = useUserCoords()

  const getStatus = (umidade: number) => {
    if (umidade <= 30) return { label: 'Seco 🌵', color: '#d21717', bg: 'rgba(210,23,23,0.08)' }
    if (umidade <= 60) return { label: 'Ideal 😎', color: '#4CAF50', bg: 'rgba(76,175,80,0.08)' }
    return { label: 'Úmido 🫧', color: '#0277BD', bg: 'rgba(2,119,189,0.08)' }
  }

  const fetchDados = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    if (!coords) return

    try {
      const [sensorRes, climaRes] = await Promise.all([
        fetch(`${API}/api/sensor`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/clima?lat=${coords.lat}&lon=${coords.lon}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (sensorRes.ok) {
        const sensorData = await sensorRes.json()
        if (sensorData.recebido) {
          setSensor(sensorData.recebido)
        setUltimaLeitura(
  new Date(sensorData.recebido.created_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
  })
)
        }
      }

      if (climaRes.ok) {
        const climaData = await climaRes.json()
        if (climaData.atual) setClima(climaData.atual)
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [coords])

  useEffect(() => {
    setEmail(localStorage.getItem('userEmail') || '')
    if (coords) {
      fetchDados()
      const interval = setInterval(fetchDados, 5000)
      return () => clearInterval(interval)
    }}, [fetchDados, coords])

  const status = sensor ? getStatus(sensor.umidade) : null
  const umidadePct = sensor ? Math.min(Math.max(sensor.umidade, 0), 100) : 0

  return (
    <div>
      {/* HEADER */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Dashboard</h1>
          <p>Bem-vindo de volta{email ? `, ${email.split('@')[0]}` : ''}! Aqui está sua plantação.</p>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 100,
          background: sensor ? 'rgba(76,175,80,0.1)' : 'rgba(158,158,158,0.1)',
          border: `1px solid ${sensor ? '#4CAF5040' : '#9e9e9e40'}`,
          fontSize: 13, fontWeight: 500,
          color: sensor ? '#4CAF50' : '#9e9e9e'
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: sensor ? '#4CAF50' : '#9e9e9e',
            animation: sensor ? 'pulse 2s infinite' : 'none'
          }} />
          {sensor ? 'Sensor Online' : 'Aguardando Sensor'}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className={styles.cards}>
        {/* Umidade */}
        <div className={styles.card} style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div className={styles.cardLabel}>💧 Umidade do Solo</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 4 }}>
                <span className={styles.cardValue}>
                  {loading ? '--' : sensor ? `${sensor.umidade}` : '--'}
                </span>
                <span className={styles.cardUnit}>%</span>
              </div>
            </div>
            {status && (
              <span style={{
                padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                color: status.color, background: status.bg, border: `1px solid ${status.color}30`
              }}>
                {status.label}
              </span>
            )}
          </div>

          {/* Barra de progresso */}
          <div style={{ background: 'var(--creme)', borderRadius: 100, height: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 100,
              width: `${umidadePct}%`,
              background: status
                ? `linear-gradient(90deg, ${status.color}99, ${status.color})`
                : 'var(--creme-mid)',
              transition: 'width 0.8s ease'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>0% Seco</span>
            <span>30–60% Ideal</span>
            <span>100% Úmido</span>
          </div>
        </div>

        {/* Temperatura sensor */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>🌡️ Temperatura (Sensor)</div>
          <div style={{ marginTop: 8 }}>
            <span className={styles.cardValue}>
              {loading ? '--' : sensor?.temperatura ?? '--'}
            </span>
            {sensor?.temperatura && <span className={styles.cardUnit}>°C</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Leitura do ESP32
          </div>
        </div>

        {/* Temperatura clima */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>⛅ Temperatura (Clima)</div>
          <div style={{ marginTop: 8 }}>
            <span className={styles.cardValue}>
              {loading ? '--' : clima ? `${clima.temperatura}` : '--'}
            </span>
            {clima && <span className={styles.cardUnit}>°C</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          Open-Meteo • {coords?.cidade || '...'}
          </div>
        </div>

        {/* Vento */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>💨 Vento</div>
          <div style={{ marginTop: 8 }}>
            <span className={styles.cardValue}>
              {loading ? '--' : clima ? `${clima.vento}` : '--'}
            </span>
            {clima && <span className={styles.cardUnit}>m/s</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Velocidade do vento
          </div>
        </div>

        {/* Última leitura */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>⏱️ Última Leitura</div>
          <div style={{ marginTop: 8 }}>
            <span className={styles.cardValue} style={{ fontSize: 20 }}>
              {loading ? '--' : ultimaLeitura}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Atualiza a cada 5s
          </div>
        </div>

        {/* Sensor ID */}
        <div className={styles.card}>
          <div className={styles.cardLabel}>📡 Sensor</div>
          <div style={{ marginTop: 8 }}>
            <span className={styles.cardValue} style={{
              fontSize: 18,
              color: sensor ? '#4CAF50' : '#9e9e9e'
            }}>
              {sensor ? 'Online' : 'Offline'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            ESP32 • SoloSmart
          </div>
        </div>
      </div>

      {/* INFO CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 8 }}>

        {/* Recomendação */}
        <div className={styles.card} style={{ borderLeft: `4px solid ${status?.color || 'var(--creme-mid)'}` }}>
          <div className={styles.cardLabel} style={{ marginBottom: 12 }}>🌱 Recomendação</div>
          {!sensor ? (
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Aguardando dados do sensor ESP32...
            </p>
          ) : sensor.umidade <= 30 ? (
            <p style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.6 }}>
              Solo muito seco. <strong>Irrigue imediatamente.</strong> Umidade abaixo de 30% pode causar estresse hídrico nas plantas.
            </p>
          ) : sensor.umidade <= 60 ? (
            <p style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.6 }}>
              Solo em condição <strong>ideal</strong>. Continue monitorando e mantenha a irrigação atual.
            </p>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.6 }}>
              Solo muito úmido. <strong>Reduza a irrigação.</strong> Excesso de água pode causar apodrecimento das raízes.
            </p>
          )}
        </div>

        {/* Clima detalhado */}
        <div className={styles.card}>
          <div className={styles.cardLabel} style={{ marginBottom: 12 }}>🌤️ Condições Climáticas</div>
          {!clima ? (
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Carregando dados do clima...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)' }}>Temperatura</span>
                <strong>{clima.temperatura}°C</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)' }}>Vento</span>
                <strong>{clima.vento} m/s</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)' }}>Última atualização</span>
                <strong>{clima.hora ? new Date(clima.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--text-muted)' }}>Localização</span>
                <strong>{coords?.cidade || '...'}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  )
}