'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Deteccao {
  doenca: string
  probabilidade: number
  causa: string
  descricao: string
  tratamento: string
}

interface ResultadoAnalise {
  status: string
  total: number
  resultados: Deteccao[]
  imagem_processada: string
}

interface HistoricoItem {
  id: string
  data: string
  total: number
  resultados: Deteccao[]
  imagem_processada: string
}

function corPorProbabilidade(p: number) {
  if (p >= 80) return { cor: '#d21717', bg: 'rgba(210,23,23,0.08)', label: 'Alta' }
  if (p >= 50) return { cor: '#E3A330', bg: 'rgba(227,163,48,0.08)', label: 'Média' }
  return { cor: '#4CAF50', bg: 'rgba(76,175,80,0.08)', label: 'Baixa' }
}

export default function SoloPicturePage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [erro, setErro] = useState('')
  const [arrastando, setArrastando] = useState(false)
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [itemSelecionado, setItemSelecionado] = useState<HistoricoItem | null>(null)
  const [emailEnviado, setEmailEnviado] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const email = localStorage.getItem('userEmail') || ''
    setUserEmail(email)
    const hist = localStorage.getItem('solopicture_historico')
    if (hist) {
      try { setHistorico(JSON.parse(hist)) } catch { }
    }
  }, [])

  function salvarHistorico(novo: HistoricoItem, listaAtual: HistoricoItem[]) {
    const atualizada = [novo, ...listaAtual].slice(0, 10) // máx 10
    setHistorico(atualizada)
    localStorage.setItem('solopicture_historico', JSON.stringify(atualizada))
  }

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setErro('Envie apenas imagens (JPG, PNG, WEBP).')
      return
    }
    setErro('')
    setResultado(null)
    setEmailEnviado(false)
    setArquivo(file)
    setItemSelecionado(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setArrastando(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  async function analisar() {
    if (!arquivo) return
    setCarregando(true)
    setErro('')
    setResultado(null)
    setEmailEnviado(false)

    try {
      const form = new FormData()
form.append('file', arquivo)
form.append('email', userEmail)

const res = await fetch('/api/analise', {
  method: 'POST',
  body: form,
})
      

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErro(data.message || 'Erro ao analisar imagem.')
        return
      }

      const data: ResultadoAnalise = await res.json()
      setResultado(data)

      const token = localStorage.getItem('token')

if (token) {
  await fetch('http://localhost:3001/api/analises', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      total_deteccoes: data.total,
      resultado_json: data.resultados,
      imagem_base64: data.imagem_processada,
    }),
  })
}

      // Salva no histórico
      const novoItem: HistoricoItem = {
        id: Date.now().toString(),
        data: new Date().toLocaleString('pt-BR'),
        total: data.total,
        resultados: data.resultados,
        imagem_processada: data.imagem_processada,
      }
      salvarHistorico(novoItem, historico)

    } catch {
      setErro('Erro de conexão. Verifique se o servidor Python está rodando na porta 8000.')
    } finally {
      setCarregando(false)
    }
  }

  async function enviarEmail(item?: HistoricoItem) {
    const alvo = item || (resultado ? {
      resultados: resultado.resultados,
      imagem_processada: resultado.imagem_processada,
    } : null)

    if (!alvo || !userEmail) return
    setEnviandoEmail(true)

    try {
      const res = await fetch('/api/relatorio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_destino: userEmail,
          deteccoes: alvo.resultados,
          imagem_base64: alvo.imagem_processada,
        }),
      })

      if (res.ok) {
        setEmailEnviado(true)
        setTimeout(() => setEmailEnviado(false), 4000)
      } else {
        setErro('Erro ao enviar email.')
      }
    } catch {
      setErro('Erro de conexão ao enviar email.')
    } finally {
      setEnviandoEmail(false)
    }
  }

  function irParaSoloChat(item?: HistoricoItem) {
    const alvo = item || resultado
    if (!alvo) return
    const contexto = alvo.resultados.map(d =>
      `${d.doenca} (${d.probabilidade}%) - Causa: ${d.causa} - Tratamento: ${d.tratamento}`
    ).join('\n')
    localStorage.setItem('solochat_contexto', contexto)
    router.push('/solochat')
  }

  function novaAnalise() {
    setArquivo(null)
    setPreview(null)
    setResultado(null)
    setErro('')
    setEmailEnviado(false)
    setItemSelecionado(null)
  }

  function limparHistorico() {
    setHistorico([])
    localStorage.removeItem('solopicture_historico')
  }

  // Resultado a exibir: análise atual ou item do histórico selecionado
  const exibindo = itemSelecionado || (resultado ? {
    total: resultado.total,
    resultados: resultado.resultados,
    imagem_processada: resultado.imagem_processada,
    data: 'Agora',
  } : null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--verde)', letterSpacing: '-0.5px' }}>
            SoloPicture
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Detecção inteligente de pragas e doenças na sua plantação
          </p>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '8px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 500,
          color: '#C56D47', background: 'rgba(197,109,71,0.08)', border: '1px solid rgba(197,109,71,0.2)',
        }}>
          🔬 YOLO v8 + IA
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: exibindo ? '1fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>

        {/* UPLOAD */}
        <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--verde)', marginBottom: '16px' }}>
            📷 Imagem da Plantação
          </h3>

          {!preview ? (
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setArrastando(true) }}
              onDragLeave={() => setArrastando(false)}
              style={{
                border: `2px dashed ${arrastando ? 'var(--laranja)' : 'var(--creme-mid)'}`,
                borderRadius: 'var(--radius-md)', padding: '48px 24px',
                textAlign: 'center', cursor: 'pointer',
                background: arrastando ? 'rgba(197,109,71,0.04)' : 'var(--creme)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌿</div>
              <p style={{ fontWeight: 600, color: 'var(--verde)', fontSize: '15px', marginBottom: '6px' }}>
                Arraste uma imagem ou clique para selecionar
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>JPG, PNG ou WEBP</p>
              <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <img
                src={resultado?.imagem_processada
                  ? `data:image/jpeg;base64,${resultado.imagem_processada}`
                  : preview}
                alt="Imagem analisada"
                style={{ width: '100%', borderRadius: 'var(--radius-sm)', maxHeight: '360px', objectFit: 'contain', background: '#000', display: 'block' }}
              />
              {resultado && (
                <div style={{
                  position: 'absolute', top: '10px', right: '10px',
                  background: resultado.total > 0 ? '#d21717' : '#4CAF50',
                  color: '#fff', borderRadius: '100px', padding: '4px 12px', fontSize: '12px', fontWeight: 700,
                }}>
                  {resultado.total > 0 ? `⚠️ ${resultado.total} detectado(s)` : '✅ Saudável'}
                </div>
              )}
            </div>
          )}

          {erro && (
            <div style={{ marginTop: '12px', background: '#fde8e8', border: '1px solid #f5c0c0', color: '#c0392b', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '13px' }}>
              {erro}
            </div>
          )}

          {emailEnviado && (
            <div style={{ marginTop: '12px', background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.3)', color: '#4CAF50', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '13px', fontWeight: 600 }}>
              ✅ Relatório enviado para {userEmail}!
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            {preview && !resultado && (
              <button onClick={analisar} disabled={carregando} style={{
                flex: 1, height: '46px',
                background: carregando ? 'var(--creme-mid)' : 'var(--laranja)',
                color: carregando ? 'var(--text-muted)' : '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '14px', fontWeight: 600,
                cursor: carregando ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                {carregando ? (
                  <><span style={{ width: '16px', height: '16px', border: '2px solid var(--text-muted)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Analisando...</>
                ) : '🔬 Analisar Imagem'}
              </button>
            )}

            {resultado && (
              <button onClick={() => enviarEmail()} disabled={enviandoEmail} style={{
                flex: 1, height: '46px', background: 'var(--ambar)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '14px', fontWeight: 600,
                cursor: enviandoEmail ? 'not-allowed' : 'pointer', opacity: enviandoEmail ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                {enviandoEmail ? 'Enviando...' : '📧 Enviar Relatório'}
              </button>
            )}

            {(preview || resultado) && (
              <button onClick={novaAnalise} style={{
                height: '46px', padding: '0 20px', background: 'var(--creme)',
                color: 'var(--text-muted)', border: '1.5px solid var(--creme-mid)',
                borderRadius: 'var(--radius-sm)', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              }}>
                Nova Análise
              </button>
            )}
          </div>
        </div>

        {/* RESULTADOS */}
        {exibindo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {itemSelecionado && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📅 {itemSelecionado.data}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => enviarEmail(itemSelecionado)} disabled={enviandoEmail} style={{
                    padding: '6px 14px', background: 'var(--ambar)', color: '#fff',
                    border: 'none', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}>
                    📧 Enviar
                  </button>
                  <button onClick={() => setItemSelecionado(null)} style={{
                    padding: '6px 14px', background: 'var(--creme)', color: 'var(--text-muted)',
                    border: '1px solid var(--creme-mid)', borderRadius: '100px', fontSize: '12px', cursor: 'pointer',
                  }}>
                    ✕ Fechar
                  </button>
                </div>
              </div>
            )}

            {itemSelecionado?.imagem_processada && (
              <img
                src={`data:image/jpeg;base64,${itemSelecionado.imagem_processada}`}
                alt="Análise anterior"
                style={{ width: '100%', borderRadius: 'var(--radius-sm)', maxHeight: '220px', objectFit: 'contain', background: '#000' }}
              />
            )}

            <div style={{
              background: exibindo.total > 0 ? 'rgba(210,23,23,0.05)' : 'rgba(76,175,80,0.05)',
              border: `1.5px solid ${exibindo.total > 0 ? 'rgba(210,23,23,0.2)' : 'rgba(76,175,80,0.2)'}`,
              borderRadius: 'var(--radius-md)', padding: '20px',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{exibindo.total > 0 ? '⚠️' : '✅'}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--verde)', marginBottom: '4px' }}>
                {exibindo.total > 0 ? `${exibindo.total} problema(s) identificado(s)` : 'Planta saudável!'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {exibindo.total > 0 ? 'Veja os detalhes abaixo e tome as medidas necessárias.' : 'Nenhuma praga ou doença detectada nesta imagem.'}
              </div>
            </div>

            {exibindo.resultados.map((d, i) => {
              const { cor, bg, label } = corPorProbabilidade(d.probabilidade)
              return (
                <div key={i} style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', borderLeft: `4px solid ${cor}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--verde)' }}>{d.doenca}</div>
                    <div style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, color: cor, background: bg }}>
                      {label} — {d.probabilidade}%
                    </div>
                  </div>
                  <div style={{ height: '6px', background: 'var(--creme)', borderRadius: '100px', marginBottom: '14px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.probabilidade}%`, background: cor, borderRadius: '100px', transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)', minWidth: '70px' }}>Causa:</span>
                      <span>{d.causa}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)', minWidth: '70px' }}>Sintomas:</span>
                      <span>{d.descricao}</span>
                    </div>
                    <div style={{ marginTop: '4px', padding: '10px 12px', background: 'rgba(76,175,80,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(76,175,80,0.15)' }}>
                      <span style={{ fontWeight: 600, color: '#4CAF50', fontSize: '12px' }}>💊 TRATAMENTO: </span>
                      <span style={{ fontSize: '13px' }}>{d.tratamento}</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {exibindo.total > 0 && (
              <button
                onClick={() => irParaSoloChat(itemSelecionado || undefined)}
                style={{
                  width: '100%', height: '52px', background: 'var(--verde)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '15px', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  boxShadow: 'var(--shadow-md)', transition: 'background 0.2s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--verde-mid)')}
                onMouseOut={e => (e.currentTarget.style.background = 'var(--verde)')}
              >
                🤖 Quero uma análise melhor — Perguntar ao SoloChat
              </button>
            )}
          </div>
        )}
      </div>

      {/* HISTÓRICO */}
      {historico.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--verde)' }}>🕓 Histórico de Análises</h3>
            <button onClick={limparHistorico} style={{
              padding: '4px 12px', background: 'transparent', border: '1px solid var(--creme-mid)',
              borderRadius: '100px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer',
            }}>
              Limpar
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {historico.map(item => (
              <div
                key={item.id}
                onClick={() => { setItemSelecionado(item); setPreview(null); setResultado(null) }}
                style={{
                  borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                  border: itemSelecionado?.id === item.id ? '2px solid var(--laranja)' : '1.5px solid var(--creme-mid)',
                  cursor: 'pointer', transition: 'border-color 0.2s',
                  background: 'var(--creme)',
                }}
              >
                {item.imagem_processada && (
                  <img
                    src={`data:image/jpeg;base64,${item.imagem_processada}`}
                    alt="Análise"
                    style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block', background: '#000' }}
                  />
                )}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{
                    fontSize: '12px', fontWeight: 700,
                    color: item.total > 0 ? '#d21717' : '#4CAF50', marginBottom: '2px',
                  }}>
                    {item.total > 0 ? `⚠️ ${item.total} problema(s)` : '✅ Saudável'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.data}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}