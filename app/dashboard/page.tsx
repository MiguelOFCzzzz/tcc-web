'use client'

import { useEffect, useState, useCallback } from 'react'
import styles from './dashboard.module.css'

const API = 'http://localhost:3001'
const LAT = -21.7495
const LON = -50.3342

interface SensorData {
  sensor_id: string | null
  umidade: number | null
  temperatura: number | null
  status_solo: string | null
  rele: boolean | null
  modo: string | null
  created_at: string | null
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

  const getStatus = (umidade: number | null) => {
    if (umidade === null) {
      return {
        label: 'Sem dados 📡',
        color: '#9e9e9e',
        bg: 'rgba(158,158,158,0.08)',
      }
    }

    if (umidade <= 30) {
      return {
        label: 'Seco 🌵',
        color: '#d21717',
        bg: 'rgba(210,23,23,0.08)',
      }
    }

    if (umidade <= 60) {
      return {
        label: 'Ideal 😎',
        color: '#4CAF50',
        bg: 'rgba(76,175,80,0.08)',
      }
    }

    return {
      label: 'Úmido 🫧',
      color: '#0277BD',
      bg: 'rgba(2,119,189,0.08)',
    }
  }

  const formatarHora = (data: string | null) => {
    if (!data) return '--'

    const d = new Date(data)

    if (Number.isNaN(d.getTime())) return '--'

    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
  }

  const fetchDados = useCallback(async () => {
    const token = localStorage.getItem('token')

    try {
      const sensorRes = await fetch(`${API}/api/sensor/monitoramento`, {
        cache: 'no-store',
      })

      if (sensorRes.ok) {
        const sensorData = await sensorRes.json()
        const recebido = sensorData.data ?? sensorData.recebido ?? sensorData

        const umidade =
          typeof recebido?.umidade === 'number' ? recebido.umidade : null

        const temperatura =
          typeof recebido?.temperatura === 'number' ? recebido.temperatura : null

        const dataLeitura =
          recebido?.created_at ??
          recebido?.atualizado_em ??
          new Date().toISOString()

        const sensorFormatado: SensorData = {
          sensor_id: recebido?.sensor_id ?? null,
          umidade,
          temperatura,
          status_solo: recebido?.status_solo ?? null,
          rele: typeof recebido?.rele === 'boolean' ? recebido.rele : null,
          modo: recebido?.modo ?? null,
          created_at: dataLeitura,
        }

        setSensor(sensorFormatado)
        setUltimaLeitura(formatarHora(dataLeitura))
      } else {
        setSensor(null)
        setUltimaLeitura('--')
      }

      if (token) {
        const climaRes = await fetch(`${API}/api/clima?lat=${LAT}&lon=${LON}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (climaRes.ok) {
          const climaData = await climaRes.json()

          if (climaData.atual) {
            setClima(climaData.atual)
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setEmail(localStorage.getItem('userEmail') || '')
    fetchDados()

    const interval = setInterval(fetchDados, 5000)

    return () => clearInterval(interval)
  }, [fetchDados])

  const status = getStatus(sensor?.umidade ?? null)
  const umidadePct =
    sensor?.umidade !== null && sensor?.umidade !== undefined
      ? Math.min(Math.max(sensor.umidade, 0), 100)
      : 0

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1>Dashboard</h1>
          <p>
            Bem-vindo de volta{email ? `, ${email.split('@')[0]}` : ''}! Aqui
            está sua plantação.
          </p>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 100,
            background: sensor ? 'rgba(76,175,80,0.1)' : 'rgba(158,158,158,0.1)',
            border: `1px solid ${sensor ? '#4CAF5040' : '#9e9e9e40'}`,
            fontSize: 13,
            fontWeight: 500,
            color: sensor ? '#4CAF50' : '#9e9e9e',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: sensor ? '#4CAF50' : '#9e9e9e',
              animation: sensor ? 'pulse 2s infinite' : 'none',
            }}
          />
          {sensor ? 'Sensor Online' : 'Aguardando Sensor'}
        </div>
      </div>

      <div className={styles.cards}>
        <div className={styles.card} style={{ gridColumn: 'span 2' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 16,
            }}
          >
            <div>
              <div className={styles.cardLabel}>💧 Umidade do Solo</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <span className={styles.cardValue}>
                  {loading ? '--' : sensor?.umidade ?? '--'}
                </span>
                <span className={styles.cardUnit}>%</span>
              </div>
            </div>

            <span
              style={{
                padding: '6px 12px',
                borderRadius: 100,
                fontSize: 12,
                fontWeight: 600,
                color: status.color,
                background: status.bg,
                border: `1px solid ${status.color}30`,
              }}
            >
              {status.label}
            </span>
          </div>

          <div
            style={{
              background: 'var(--creme)',
              borderRadius: 100,
              height: 10,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 100,
                width: `${umidadePct}%`,
                background: `linear-gradient(90deg, ${status.color}99, ${status.color})`,
                transition: 'width 0.8s ease',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
              fontSize: 11,
              color: 'var(--text-muted)',
            }}
          >
            <span>0% Seco</span>
            <span>30–60% Ideal</span>
            <span>100% Úmido</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>🌱 Status do Solo</div>
          <div style={{ marginTop: 8 }}>
            <span className={styles.cardValue} style={{ fontSize: 22 }}>
              {loading ? '--' : sensor?.status_solo ?? '--'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Classificação enviada pelo ESP32
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>⚙️ Irrigação / Relé</div>
          <div style={{ marginTop: 8 }}>
            <span
              className={styles.cardValue}
              style={{
                fontSize: 22,
                color: sensor?.rele ? '#4CAF50' : '#9e9e9e',
              }}
            >
              {loading
                ? '--'
                : sensor?.rele === null || sensor?.rele === undefined
                  ? '--'
                  : sensor.rele
                    ? 'Ligado'
                    : 'Desligado'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            {sensor?.modo ? `Modo ${sensor.modo}` : 'Controle automático/manual'}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>⛅ Temperatura (Clima)</div>
          <div style={{ marginTop: 8 }}>
            <span className={styles.cardValue}>
              {loading ? '--' : clima ? `${clima.temperatura}` : '--'}
            </span>
            {clima && <span className={styles.cardUnit}>°C</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Open-Meteo • Pompeia/SP
          </div>
        </div>

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

        <div className={styles.card}>
          <div className={styles.cardLabel}>📡 Sensor</div>
          <div style={{ marginTop: 8 }}>
            <span
              className={styles.cardValue}
              style={{
                fontSize: 18,
                color: sensor ? '#4CAF50' : '#9e9e9e',
              }}
            >
              {sensor ? 'Online' : 'Offline'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            {sensor?.sensor_id ?? 'ESP32 • SoloSmart'}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginTop: 8,
        }}
      >
        <div
          className={styles.card}
          style={{ borderLeft: `4px solid ${status.color}` }}
        >
          <div className={styles.cardLabel} style={{ marginBottom: 12 }}>
            🌱 Recomendação
          </div>

          {!sensor || sensor.umidade === null ? (
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Aguardando dados do sensor ESP32...
            </p>
          ) : sensor.umidade <= 30 ? (
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-main)',
                lineHeight: 1.6,
              }}
            >
              Solo muito seco. <strong>Irrigue imediatamente.</strong> Umidade
              abaixo de 30% pode causar estresse hídrico nas plantas.
            </p>
          ) : sensor.umidade <= 60 ? (
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-main)',
                lineHeight: 1.6,
              }}
            >
              Solo em condição <strong>ideal</strong>. Continue monitorando e
              mantenha a irrigação atual.
            </p>
          ) : (
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-main)',
                lineHeight: 1.6,
              }}
            >
              Solo muito úmido. <strong>Reduza a irrigação.</strong> Excesso de
              água pode causar apodrecimento das raízes.
            </p>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel} style={{ marginBottom: 12 }}>
            🌤️ Condições Climáticas
          </div>

          {!clima ? (
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Carregando dados do clima...
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 14,
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Temperatura</span>
                <strong>{clima.temperatura}°C</strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 14,
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Vento</span>
                <strong>{clima.vento} m/s</strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 14,
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  Última atualização
                </span>
                <strong>{formatarHora(clima.hora)}</strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 14,
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Localização</span>
                <strong>Pompeia/SP</strong>
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