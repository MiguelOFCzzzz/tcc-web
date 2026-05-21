'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUserCoords } from '../hooks/useUserCoords'

interface Leitura {
  id: number
  umidade: number
  temperatura: number | null
  created_at: string
}

interface Zona {
  id: string
  nome: string
  descricao: string
  emoji: string
  umidadeMin: number
  umidadeMax: number
  cor: string
  bg: string
  recomendacao: string
  culturas: string[]
}

const ZONAS: Zona[] = [
  {
    id: 'critico-seco',
    nome: 'Zona Crítica — Seca',
    descricao: 'Solo extremamente seco. Risco alto de estresse hídrico e morte das raízes.',
    emoji: '🌵',
    umidadeMin: 0,
    umidadeMax: 20,
    cor: '#b71c1c',
    bg: 'rgba(183,28,28,0.06)',
    recomendacao: 'Irrigação imediata e urgente. Monitore a cada 30 minutos.',
    culturas: ['Cana-de-açúcar', 'Milho', 'Soja'],
  },
  {
    id: 'seco',
    nome: 'Zona Seca',
    descricao: 'Umidade abaixo do ideal. Plantas podem apresentar murcha e redução no crescimento.',
    emoji: '🏜️',
    umidadeMin: 20,
    umidadeMax: 35,
    cor: '#d21717',
    bg: 'rgba(210,23,23,0.06)',
    recomendacao: 'Irrigar nas próximas 2 horas. Evite horários de pico de calor.',
    culturas: ['Feijão', 'Tomate', 'Alface'],
  },
  {
    id: 'atencao',
    nome: 'Zona de Atenção',
    descricao: 'Solo na transição. Monitore de perto antes que atinja o nível crítico.',
    emoji: '⚠️',
    umidadeMin: 35,
    umidadeMax: 45,
    cor: '#E3A330',
    bg: 'rgba(227,163,48,0.06)',
    recomendacao: 'Programar irrigação leve para as próximas horas.',
    culturas: ['Trigo', 'Arroz', 'Batata'],
  },
  {
    id: 'ideal',
    nome: 'Zona Ideal',
    descricao: 'Condições perfeitas para o desenvolvimento das culturas. Mantenha este nível.',
    emoji: '✅',
    umidadeMin: 45,
    umidadeMax: 65,
    cor: '#2e7d32',
    bg: 'rgba(46,125,50,0.06)',
    recomendacao: 'Continue o manejo atual. Monitore regularmente.',
    culturas: ['Todas as culturas'],
  },
  {
    id: 'umido',
    nome: 'Zona Úmida',
    descricao: 'Solo com umidade elevada. Risco de fungos e doenças de raiz.',
    emoji: '💧',
    umidadeMin: 65,
    umidadeMax: 80,
    cor: '#0277BD',
    bg: 'rgba(2,119,189,0.06)',
    recomendacao: 'Suspender irrigação. Melhorar drenagem se persistir.',
    culturas: ['Arroz inundado', 'Taro'],
  },
  {
    id: 'saturado',
    nome: 'Zona Saturada',
    descricao: 'Solo encharcado. Alto risco de podridão das raízes e asfixia radicular.',
    emoji: '🌊',
    umidadeMin: 80,
    umidadeMax: 100,
    cor: '#01579B',
    bg: 'rgba(1,87,155,0.06)',
    recomendacao: 'Drenagem urgente. Evite qualquer irrigação.',
    culturas: ['Nenhuma recomendada'],
  },
]

function getZona(umidade: number): Zona {
  return ZONAS.find(z => umidade >= z.umidadeMin && umidade < z.umidadeMax) || ZONAS[ZONAS.length - 1]
}

function formatDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  })
}

export default function ZonasPage() {
  const [sensorAtual, setSensorAtual] = useState<Leitura | null>(null)
  const [historico, setHistorico] = useState<Leitura[]>([])
  const [loading, setLoading] = useState(true)
  const [zonaAtiva, setZonaAtiva] = useState<string | null>(null)
const coords = useUserCoords()

  const fetchDados = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const [resS, resH] = await Promise.all([
        fetch('http://localhost:3001/api/sensor', { headers }),
        fetch('http://localhost:3001/api/sensor/historico', { headers }),
      ])
      if (resS.ok) {
        const d = await resS.json()
        setSensorAtual(d.recebido || null)
      }
      if (resH.ok) {
        const d = await resH.json()
        setHistorico(d.historico || [])
      }
    } catch { /* keep */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDados() }, [fetchDados])

  const zonaAtual = sensorAtual ? getZona(sensorAtual.umidade) : null

  // Tempo em cada zona com base no histórico
  const tempoZona: Record<string, number> = {}
  historico.forEach(h => {
    const z = getZona(h.umidade)
    tempoZona[z.id] = (tempoZona[z.id] || 0) + 1
  })
  const totalLeituras = historico.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--verde)', letterSpacing: '-0.5px' }}>Zonas do Solo</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Classificação agronômica baseada nos dados do seu sensor
          </p>
        </div>
        {zonaAtual && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600,
            color: zonaAtual.cor, background: zonaAtual.bg, border: `1px solid ${zonaAtual.cor}30`
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: zonaAtual.cor, display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Agora: {zonaAtual.nome}
          </div>
        )}
      </div>

      {/* RÉGUA VISUAL DE UMIDADE */}
      <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '28px', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--verde)', marginBottom: '20px' }}>
          🎚️ Régua de Zonas — Umidade do Solo
        </h3>

        {/* Barra de zonas */}
        <div style={{ position: 'relative', height: '48px', borderRadius: '100px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ display: 'flex', height: '100%' }}>
            {ZONAS.map(z => (
              <div
                key={z.id}
                onClick={() => setZonaAtiva(zonaAtiva === z.id ? null : z.id)}
                title={z.nome}
                style={{
                  flex: z.umidadeMax - z.umidadeMin,
                  background: z.cor,
                  opacity: zonaAtiva && zonaAtiva !== z.id ? 0.35 : 1,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px',
                  filter: zonaAtiva === z.id ? 'brightness(1.15)' : undefined,
                }}
              >
                {z.emoji}
              </div>
            ))}
          </div>

          {/* Indicador da leitura atual */}
          {sensorAtual && (
            <div style={{
              position: 'absolute',
              left: `${sensorAtual.umidade}%`,
              top: 0,
              transform: 'translateX(-50%)',
              width: '4px',
              height: '100%',
              background: '#fff',
              boxShadow: '0 0 8px rgba(0,0,0,0.4)',
              zIndex: 2,
            }}>
              <div style={{
                position: 'absolute',
                top: '-28px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#2A3D1D',
                color: '#fff',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                {sensorAtual.umidade}% agora
              </div>
            </div>
          )}
        </div>

        {/* Marcadores de %  */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', padding: '0 2px' }}>
          {[0, 20, 35, 45, 65, 80, 100].map(v => (
            <span key={v}>{v}%</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: sensorAtual ? '1fr 340px' : '1fr', gap: '20px', alignItems: 'start' }}>

        {/* ZONAS CARDS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ZONAS.map(z => {
            const ativa = zonaAtual?.id === z.id
            const pct = totalLeituras > 0 ? Math.round(((tempoZona[z.id] || 0) / totalLeituras) * 100) : 0
            const expandida = zonaAtiva === z.id || ativa

            return (
              <div
                key={z.id}
                onClick={() => setZonaAtiva(zonaAtiva === z.id ? null : z.id)}
                style={{
                  background: '#fff',
                  borderRadius: 'var(--radius-md)',
                  padding: expandida ? '20px' : '16px 20px',
                  boxShadow: ativa ? `0 0 0 2px ${z.cor}, var(--shadow-sm)` : 'var(--shadow-sm)',
                  borderLeft: `5px solid ${z.cor}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: zonaAtiva && zonaAtiva !== z.id && !ativa ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px', flexShrink: 0 }}>{z.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--verde)' }}>{z.nome}</span>
                      {ativa && (
                        <span style={{
                          padding: '2px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700,
                          background: z.cor, color: '#fff', animation: 'pulse 2s infinite'
                        }}>ATUAL</span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {z.umidadeMin}% – {z.umidadeMax}%
                      </span>
                    </div>

                    {/* Barra de tempo nesta zona */}
                    {totalLeituras > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '5px', background: 'var(--creme)', borderRadius: '100px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: z.cor, borderRadius: '100px', transition: 'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '30px', textAlign: 'right' }}>{pct}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {expandida && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--creme)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.6 }}>{z.descricao}</p>
                    <div style={{ padding: '10px 14px', background: z.bg, borderRadius: 'var(--radius-sm)', border: `1px solid ${z.cor}20` }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: z.cor }}>💡 Recomendação: </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>{z.recomendacao}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Culturas:</span>
                      {z.culturas.map(c => (
                        <span key={c} style={{
                          fontSize: '12px', padding: '2px 10px', borderRadius: '100px',
                          background: 'var(--creme)', border: '1px solid var(--creme-mid)', color: 'var(--text-main)'
                        }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* PAINEL LATERAL — situação atual */}
        {sensorAtual && zonaAtual && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '20px' }}>
            <div style={{
              background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px',
              boxShadow: 'var(--shadow-sm)', borderTop: `4px solid ${zonaAtual.cor}`
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Leitura Atual
              </div>
              <div style={{ fontSize: '48px', fontWeight: 800, color: zonaAtual.cor, letterSpacing: '-2px', lineHeight: 1 }}>
                {sensorAtual.umidade}%
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--verde)', marginTop: '8px' }}>
                {zonaAtual.emoji} {zonaAtual.nome}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {formatDataHora(sensorAtual.created_at)}
              </div>

              <div style={{ marginTop: '16px', padding: '12px', background: zonaAtual.bg, borderRadius: 'var(--radius-sm)', border: `1px solid ${zonaAtual.cor}20` }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: zonaAtual.cor, marginBottom: '4px' }}>💡 Ação recomendada</div>
                <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>{zonaAtual.recomendacao}</div>
              </div>

              {sensorAtual.temperatura !== null && (
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '10px 0', borderTop: '1px solid var(--creme)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>🌡️ Temperatura sensor</span>
                  <strong>{sensorAtual.temperatura}°C</strong>
                </div>
              )}
            </div>

            {/* Distribuição histórica */}
            {totalLeituras > 0 && (
              <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
                  Distribuição Histórica
                </div>
                {ZONAS.map(z => {
                  const pct = Math.round(((tempoZona[z.id] || 0) / totalLeituras) * 100)
                  if (pct === 0) return null
                  return (
                    <div key={z.id} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-main)' }}>{z.emoji} {z.nome.split('—')[0].trim()}</span>
                        <span style={{ fontWeight: 700, color: z.cor }}>{pct}%</span>
                      </div>
                      <div style={{ height: '5px', background: 'var(--creme)', borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: z.cor, borderRadius: '100px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}