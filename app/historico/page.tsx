'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Chart from 'chart.js/auto'

interface Leitura {
  id: number
  umidade: number
  temperatura: number | null
  created_at: string
}

interface EstatsDia {
  data: string
  mediaUmidade: number
  minUmidade: number
  maxUmidade: number
  leituras: number
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
  })
}

function formatDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  })
}

function formatDataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo'
  })
}

function getStatusUmidade(u: number) {
  if (u <= 30) return { label: 'Seco', color: '#d21717', bg: 'rgba(210,23,23,0.08)' }
  if (u <= 60) return { label: 'Ideal', color: '#4CAF50', bg: 'rgba(76,175,80,0.08)' }
  return { label: 'Úmido', color: '#0277BD', bg: 'rgba(2,119,189,0.08)' }
}

function agruparPorDia(leituras: Leitura[]): EstatsDia[] {
  const grupos: Record<string, Leitura[]> = {}
  leituras.forEach(l => {
    const dia = new Date(l.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    if (!grupos[dia]) grupos[dia] = []
    grupos[dia].push(l)
  })
  return Object.entries(grupos).map(([data, items]) => ({
    data,
    mediaUmidade: Math.round(items.reduce((s, i) => s + i.umidade, 0) / items.length),
    minUmidade: Math.min(...items.map(i => i.umidade)),
    maxUmidade: Math.max(...items.map(i => i.umidade)),
    leituras: items.length,
  }))
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<Leitura[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'tabela' | 'grafico'>('grafico')
  const [periodo, setPeriodo] = useState<20 | 50 | 100>(50)

  const linhaRef = useRef<HTMLCanvasElement>(null)
  const tempRef = useRef<HTMLCanvasElement>(null)
  const chartLinhaRef = useRef<Chart | null>(null)
  const chartTempRef = useRef<Chart | null>(null)

  const fetchHistorico = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    try {
      const res = await fetch('http://localhost:3001/api/sensor/historico', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setHistorico(data.historico || [])
      }
    } catch { /* keep */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchHistorico() }, [fetchHistorico])

  useEffect(() => {
    if (view !== 'grafico' || historico.length === 0) return

    chartLinhaRef.current?.destroy()
    chartTempRef.current?.destroy()

    const dados = [...historico].reverse().slice(-periodo)
    const labels = dados.map(h => formatHora(h.created_at))
    const gridColor = 'rgba(42,61,29,0.06)'
    const tick = { color: '#7a7260', font: { family: 'Poppins' as const, size: 11 } }
    const tooltip = { backgroundColor: '#2A3D1D', titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.75)', padding: 10, cornerRadius: 8 }

    if (linhaRef.current) {
      chartLinhaRef.current = new Chart(linhaRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Umidade (%)',
            data: dados.map(h => h.umidade),
            borderColor: '#0277BD',
            backgroundColor: 'rgba(2,119,189,0.07)',
            borderWidth: 2.5,
            pointRadius: dados.length > 30 ? 0 : 3,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#0277BD',
            tension: 0.4,
            fill: true,
          }, {
            label: 'Seco (30%)',
            data: dados.map(() => 30),
            borderColor: 'rgba(210,23,23,0.3)',
            borderWidth: 1,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
          }, {
            label: 'Ideal máx (60%)',
            data: dados.map(() => 60),
            borderColor: 'rgba(76,175,80,0.3)',
            borderWidth: 1,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: '#7a7260', font: { family: 'Poppins', size: 11 }, usePointStyle: true } }, tooltip },
          scales: {
            y: { grid: { color: gridColor }, ticks: { ...tick, callback: v => `${v}%` }, border: { display: false }, min: 0, max: 100 },
            x: { grid: { display: false }, ticks: { ...tick, maxTicksLimit: 12 }, border: { display: false } }
          },
        },
      })
    }

    const comTemp = dados.filter(h => h.temperatura !== null)
    if (tempRef.current && comTemp.length > 0) {
      chartTempRef.current = new Chart(tempRef.current, {
        type: 'line',
        data: {
          labels: comTemp.map(h => formatHora(h.created_at)),
          datasets: [{
            label: 'Temperatura (°C)',
            data: comTemp.map(h => h.temperatura),
            borderColor: '#C56D47',
            backgroundColor: 'rgba(197,109,71,0.07)',
            borderWidth: 2.5,
            pointRadius: comTemp.length > 30 ? 0 : 3,
            tension: 0.4,
            fill: true,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip },
          scales: {
            y: { grid: { color: gridColor }, ticks: { ...tick, callback: v => `${v}°C` }, border: { display: false } },
            x: { grid: { display: false }, ticks: { ...tick, maxTicksLimit: 12 }, border: { display: false } }
          },
        },
      })
    }

    return () => {
      chartLinhaRef.current?.destroy()
      chartTempRef.current?.destroy()
    }
  }, [historico, view, periodo])

  const dados = [...historico].reverse().slice(-periodo)
  const porDia = agruparPorDia(historico)

  // Stats gerais
  const umidades = historico.map(h => h.umidade)
  const mediaGeral = umidades.length ? Math.round(umidades.reduce((a, b) => a + b, 0) / umidades.length) : null
  const statusGeral = mediaGeral !== null ? getStatusUmidade(mediaGeral) : null

  return (
   <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', margin: '0 auto', padding: '32px 40px', width: '100%' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--verde)', letterSpacing: '-0.5px' }}>Histórico</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Leituras do sensor ESP32 ao longo do tempo
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Período */}
          <div style={{ display: 'flex', background: '#fff', borderRadius: '100px', padding: '3px', border: '1.5px solid var(--creme-mid)' }}>
            {([20, 50, 100] as const).map(p => (
              <button key={p} onClick={() => setPeriodo(p)} style={{
                padding: '5px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: periodo === p ? 'var(--verde)' : 'transparent',
                color: periodo === p ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}>{p}</button>
            ))}
          </div>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#fff', borderRadius: '100px', padding: '3px', border: '1.5px solid var(--creme-mid)' }}>
            {(['grafico', 'tabela'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: view === v ? 'var(--laranja)' : 'transparent',
                color: view === v ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}>{v === 'grafico' ? '📈 Gráfico' : '📋 Tabela'}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { icon: '📡', label: 'Total de Leituras', value: historico.length },
          { icon: '💧', label: 'Média de Umidade', value: mediaGeral !== null ? `${mediaGeral}%` : '--' },
          { icon: '📅', label: 'Dias com Dados', value: porDia.length },
          { icon: '🌡️', label: 'Status Geral', value: statusGeral?.label || '--', cor: statusGeral?.color },
        ].map((k, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 'var(--radius-md)', padding: '20px',
            boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '14px'
          }}>
            <div style={{
              width: '44px', height: '44px', background: 'var(--creme)',
              borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '20px', flexShrink: 0
            }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: k.cor || 'var(--verde)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{k.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Carregando histórico...</div>
      ) : historico.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '48px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📡</div>
          <p style={{ fontWeight: 600, color: 'var(--verde)', marginBottom: '6px' }}>Sem dados de sensor ainda</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>O ESP32 ainda não enviou leituras. Verifique a conexão Wi-Fi do sensor.</p>
        </div>
      ) : view === 'grafico' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--verde)' }}>💧 Histórico de Umidade</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--creme)', padding: '3px 10px', borderRadius: '100px', border: '1px solid var(--creme-mid)' }}>
                {dados.length} leituras
              </span>
            </div>
            <div style={{ height: '260px' }}>
              <canvas ref={linhaRef} />
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--verde)' }}>🌡️ Histórico de Temperatura</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--creme)', padding: '3px 10px', borderRadius: '100px', border: '1px solid var(--creme-mid)' }}>ESP32</span>
            </div>
            <div style={{ height: '200px' }}>
              <canvas ref={tempRef} />
            </div>
          </div>

          {/* Resumo por dia */}
          {porDia.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--verde)', marginBottom: '16px' }}>📅 Resumo por Dia</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {porDia.slice(0, 7).map((dia, i) => {
                  const st = getStatusUmidade(dia.mediaUmidade)
                  return (
                    <div key={i} style={{
                      padding: '14px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--creme)', border: `1.5px solid ${st.color}30`
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>{dia.data}</div>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: st.color }}>{dia.mediaUmidade}%</div>
                      <div style={{ fontSize: '11px', color: st.color, fontWeight: 600, marginTop: '2px' }}>{st.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        min {dia.minUmidade}% · max {dia.maxUmidade}%
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dia.leituras} leituras</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TABELA */
        <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--creme)', borderBottom: '1.5px solid var(--creme-mid)' }}>
                  {['#', 'Data e Hora', 'Umidade', 'Status', 'Temperatura'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.map((l, i) => {
                  const st = getStatusUmidade(l.umidade)
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--creme)', background: i % 2 === 0 ? '#fff' : 'rgba(42,61,29,0.01)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>{l.id}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-main)' }}>{formatDataHora(l.created_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '60px', height: '6px', background: 'var(--creme)', borderRadius: '100px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(l.umidade, 100)}%`, background: st.color, borderRadius: '100px' }} />
                          </div>
                          <span style={{ fontWeight: 700, color: st.color }}>{l.umidade}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, color: st.color, background: st.bg }}>{st.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-main)' }}>
                        {l.temperatura !== null ? `${l.temperatura}°C` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}