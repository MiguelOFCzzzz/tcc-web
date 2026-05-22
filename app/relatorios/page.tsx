'use client'

import { useEffect, useState, useCallback } from 'react'

const API = 'http://localhost:3001'

interface Deteccao {
  doenca: string
  probabilidade: number
  causa: string
  descricao: string
  tratamento: string
}

interface Analise {
  id: number
  total_deteccoes: number
  resultado_json: Deteccao[]
  created_at: string
}

interface ResumoStats {
  total: number
  comProblemas: number
  saudaveis: number
  doencaMaisFrequente: string | null
}

function calcStats(analises: Analise[]): ResumoStats {
  const comProblemas = analises.filter(a => a.total_deteccoes > 0).length
  const todas = analises.flatMap(a => a.resultado_json || [])
  const freq: Record<string, number> = {}

  todas.forEach(d => {
    freq[d.doenca] = (freq[d.doenca] || 0) + 1
  })

  const doencaMaisFrequente =
    Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0] || null

  return {
    total: analises.length,
    comProblemas,
    saudaveis: analises.length - comProblemas,
    doencaMaisFrequente,
  }
}

function formatData(iso: string) {
  if (!iso) return '--'

  const data = new Date(iso)

  if (Number.isNaN(data.getTime())) return '--'

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function corProb(p: number) {
  if (p >= 80) return '#d21717'
  if (p >= 50) return '#E3A330'
  return '#4CAF50'
}

function normalizarResultadoJson(resultado: unknown): Deteccao[] {
  if (!resultado) return []

  if (Array.isArray(resultado)) {
    return resultado as Deteccao[]
  }

  if (typeof resultado === 'string') {
    try {
      const parsed = JSON.parse(resultado)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

function normalizarAnalise(a: any): Analise {
  const resultado = normalizarResultadoJson(
    a.resultado_json ?? a.resultados ?? a.deteccoes
  )

  return {
    id: Number(a.id ?? Date.now()),
    total_deteccoes: Number(
      a.total_deteccoes ?? a.total ?? resultado.length ?? 0
    ),
    resultado_json: resultado,
    created_at: a.created_at ?? a.data ?? new Date().toISOString(),
  }
}

export default function RelatoriosPage() {
  const [analises, setAnalises] = useState<Analise[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [selecionada, setSelecionada] = useState<Analise | null>(null)
  const [filtro, setFiltro] = useState<'todas' | 'problemas' | 'saudaveis'>('todas')
  const [enviando, setEnviando] = useState(false)
  const [emailOk, setEmailOk] = useState(false)

  const fetchAnalises = useCallback(async () => {
    setLoading(true)
    setErro('')

    try {
      const token = localStorage.getItem('token')

      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {}

      const res = await fetch(`${API}/api/analises`, {
        headers,
        cache: 'no-store',
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('Erro API /api/analises:', res.status, text)
        setErro('Não foi possível carregar os relatórios.')
        return
      }

      const data = await res.json()

      const base =
        data.analises ??
        data.data ??
        data.resultados ??
        data ??
        []

      const lista: Analise[] = Array.isArray(base)
        ? base.map(normalizarAnalise)
        : []

      setAnalises(lista)

      setSelecionada(prev => {
        if (prev && lista.some(a => a.id === prev.id)) return prev
        return lista[0] ?? null
      })
    } catch (err) {
      console.error('Erro ao buscar análises:', err)
      setErro('Erro de conexão com o servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalises()
  }, [fetchAnalises])

  async function enviarEmail(analise: Analise) {
    const email = localStorage.getItem('userEmail')

    if (!email) {
      setErro('Email do usuário não encontrado. Faça login novamente.')
      return
    }

    setEnviando(true)
    setErro('')

    try {
      const res = await fetch('/api/relatorio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_destino: email,
          deteccoes: analise.resultado_json,
          imagem_base64: null,
        }),
      })

      if (!res.ok) {
        setErro('Erro ao enviar relatório por email.')
        return
      }

      setEmailOk(true)
      setTimeout(() => setEmailOk(false), 3000)
    } catch {
      setErro('Erro de conexão ao enviar relatório.')
    } finally {
      setEnviando(false)
    }
  }

  const stats = calcStats(analises)

  const filtradas = analises.filter(a => {
    if (filtro === 'problemas') return a.total_deteccoes > 0
    if (filtro === 'saudaveis') return a.total_deteccoes === 0
    return true
  })

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 40px',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 700,
              color: 'var(--verde)',
              letterSpacing: '-0.5px',
            }}
          >
            Relatórios
          </h1>

          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}
          >
            Histórico completo das análises SoloPicture
          </p>
        </div>

        <button
          onClick={fetchAnalises}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: '100px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'var(--verde)',
            color: '#fff',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>

        {emailOk && (
          <div
            style={{
              padding: '8px 16px',
              borderRadius: '100px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'rgba(76,175,80,0.1)',
              color: '#4CAF50',
              border: '1px solid rgba(76,175,80,0.3)',
            }}
          >
            ✅ Relatório enviado por email!
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }}
      >
        {[
          {
            icon: '📊',
            label: 'Total de Análises',
            value: stats.total,
            cor: 'var(--verde)',
          },
          {
            icon: '⚠️',
            label: 'Com Problemas',
            value: stats.comProblemas,
            cor: '#d21717',
          },
          {
            icon: '✅',
            label: 'Saudáveis',
            value: stats.saudaveis,
            cor: '#4CAF50',
          },
          {
            icon: '🔬',
            label: 'Doença + Frequente',
            value: stats.doencaMaisFrequente || '—',
            cor: '#E3A330',
            small: true,
          },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: '#fff',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--creme)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>

            <div>
              <div
                style={{
                  fontSize: s.small ? '13px' : '24px',
                  fontWeight: 700,
                  color: s.cor,
                  letterSpacing: '-0.5px',
                  lineHeight: 1.1,
                }}
              >
                {s.value}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  marginTop: '3px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 500,
                }}
              >
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            color: 'var(--text-muted)',
          }}
        >
          Carregando relatórios...
        </div>
      ) : erro ? (
        <div
          style={{
            background: '#fde8e8',
            border: '1px solid #f5c0c0',
            color: '#c0392b',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            fontSize: '14px',
          }}
        >
          {erro}
        </div>
      ) : analises.length === 0 ? (
        <div
          style={{
            background: '#fff',
            borderRadius: 'var(--radius-md)',
            padding: '48px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔬</div>
          <p
            style={{
              fontWeight: 600,
              color: 'var(--verde)',
              marginBottom: '6px',
            }}
          >
            Nenhuma análise ainda
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Acesse o SoloPicture e faça sua primeira análise de plantação.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '340px 1fr',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid var(--creme-mid)',
                display: 'flex',
                gap: '8px',
              }}
            >
              {(['todas', 'problemas', 'saudaveis'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: '100px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: filtro === f ? 'var(--verde)' : 'var(--creme)',
                    color: filtro === f ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                  }}
                >
                  {f === 'todas'
                    ? 'Todas'
                    : f === 'problemas'
                      ? '⚠️ Problemas'
                      : '✅ Saudáveis'}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
              {filtradas.length === 0 ? (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                  }}
                >
                  Nenhuma análise neste filtro.
                </div>
              ) : (
                filtradas.map(a => (
                  <div
                    key={a.id}
                    onClick={() => setSelecionada(a)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--creme)',
                      cursor: 'pointer',
                      background:
                        selecionada?.id === a.id
                          ? 'rgba(42,61,29,0.04)'
                          : '#fff',
                      borderLeft:
                        selecionada?.id === a.id
                          ? '3px solid var(--laranja)'
                          : '3px solid transparent',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        flexShrink: 0,
                        background:
                          a.total_deteccoes > 0
                            ? 'rgba(210,23,23,0.08)'
                            : 'rgba(76,175,80,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}
                    >
                      {a.total_deteccoes > 0 ? '⚠️' : '✅'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '13px',
                          color: 'var(--text-main)',
                          marginBottom: '2px',
                        }}
                      >
                        {a.total_deteccoes > 0
                          ? `${a.total_deteccoes} problema(s)`
                          : 'Planta saudável'}
                      </div>

                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {formatData(a.created_at)}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '100px',
                        background:
                          a.total_deteccoes > 0
                            ? 'rgba(210,23,23,0.08)'
                            : 'rgba(76,175,80,0.08)',
                        color: a.total_deteccoes > 0 ? '#d21717' : '#4CAF50',
                      }}
                    >
                      #{a.id}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selecionada && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'var(--verde)',
                    }}
                  >
                    Análise #{selecionada.id}
                  </div>

                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {formatData(selecionada.created_at)}
                  </div>
                </div>

                <button
                  onClick={() => enviarEmail(selecionada)}
                  disabled={enviando}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--ambar)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: enviando ? 'not-allowed' : 'pointer',
                    opacity: enviando ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {enviando ? 'Enviando...' : '📧 Enviar por Email'}
                </button>
              </div>

              <div
                style={{
                  background:
                    selecionada.total_deteccoes > 0
                      ? 'rgba(210,23,23,0.05)'
                      : 'rgba(76,175,80,0.05)',
                  border: `1.5px solid ${
                    selecionada.total_deteccoes > 0
                      ? 'rgba(210,23,23,0.2)'
                      : 'rgba(76,175,80,0.2)'
                  }`,
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div style={{ fontSize: '40px' }}>
                  {selecionada.total_deteccoes > 0 ? '⚠️' : '✅'}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--verde)',
                    }}
                  >
                    {selecionada.total_deteccoes > 0
                      ? `${selecionada.total_deteccoes} problema(s) identificado(s)`
                      : 'Planta saudável — nenhum problema detectado'}
                  </div>

                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {selecionada.total_deteccoes > 0
                      ? 'Veja os detalhes abaixo e tome as medidas recomendadas.'
                      : 'Nenhuma praga ou doença foi identificada nesta análise.'}
                  </div>
                </div>
              </div>

              {(selecionada.resultado_json || []).map((d, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fff',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-sm)',
                    borderLeft: `4px solid ${corProb(d.probabilidade)}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '15px',
                        color: 'var(--verde)',
                      }}
                    >
                      {d.doenca}
                    </div>

                    <div
                      style={{
                        padding: '3px 10px',
                        borderRadius: '100px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: corProb(d.probabilidade),
                        background: `${corProb(d.probabilidade)}15`,
                      }}
                    >
                      {d.probabilidade}% confiança
                    </div>
                  </div>

                  <div
                    style={{
                      height: '6px',
                      background: 'var(--creme)',
                      borderRadius: '100px',
                      marginBottom: '14px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${d.probabilidade}%`,
                        background: corProb(d.probabilidade),
                        borderRadius: '100px',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                        }}
                      >
                        Causa:{' '}
                      </span>
                      {d.causa}
                    </div>

                    <div>
                      <span
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                        }}
                      >
                        Sintomas:{' '}
                      </span>
                      {d.descricao}
                    </div>

                    <div
                      style={{
                        marginTop: '4px',
                        padding: '10px 12px',
                        background: 'rgba(76,175,80,0.06)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(76,175,80,0.15)',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: '#4CAF50',
                          fontSize: '12px',
                        }}
                      >
                        💊 TRATAMENTO:{' '}
                      </span>
                      {d.tratamento}
                    </div>
                  </div>
                </div>
              ))}

              {selecionada.total_deteccoes === 0 && (
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-sm)',
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                  }}
                >
                  Nenhuma detecção foi registrada nessa análise.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}