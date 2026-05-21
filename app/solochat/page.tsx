'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO string para poder salvar no localStorage
}

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4 style="margin:12px 0 4px;color:var(--verde);font-size:14px;">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 style="margin:14px 0 6px;color:var(--verde);font-size:15px;">$1</h3>')
    .replace(/^- (.*$)/gm, '<li style="margin:3px 0;padding-left:4px;">$1</li>')
    .replace(/(<li.*<\/li>)/g, '<ul style="margin:8px 0;padding-left:20px;">$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

const SUGESTOES = [
  'Como melhorar a umidade do solo?',
  'Quais adubos usar para solo ácido?',
  'Como identificar deficiência de nitrogênio?',
  'Quando é a melhor hora para irrigar?',
]

const MSG_BOAS_VINDAS: Mensagem = {
  role: 'assistant',
  content: 'Olá! Sou o **SoloBot**, seu agrônomo virtual. Posso ajudar com diagnósticos de solo, pragas, doenças, irrigação e muito mais.\n\nComo posso ajudar sua plantação hoje?',
  timestamp: new Date().toISOString(),
}

const STORAGE_KEY = 'solochat_mensagens'

export default function SoloChatPage() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [contextoInicial, setContextoInicial] = useState('')
  const [inicializado, setInicializado] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Inicializa: carrega histórico do localStorage ou contexto do SoloPicture
  useEffect(() => {
    const ctx = localStorage.getItem('solochat_contexto')

    if (ctx) {
      // Veio do SoloPicture — inicia conversa nova com o contexto
      localStorage.removeItem('solochat_contexto')
      setContextoInicial(ctx)

      const msgContexto: Mensagem = {
        role: 'assistant',
        content: `Olá! Recebi os resultados da análise do **SoloPicture**. Identifiquei os seguintes problemas na sua plantação:\n\n${ctx.split('\n').map((l: string) => `- ${l}`).join('\n')}\n\nO que você gostaria de saber sobre o tratamento ou prevenção?`,
        timestamp: new Date().toISOString(),
      }
      const novas = [msgContexto]
      setMensagens(novas)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novas))
    } else {
      // Tenta carregar histórico salvo
      const salvo = localStorage.getItem(STORAGE_KEY)
      if (salvo) {
        try {
          const parsed: Mensagem[] = JSON.parse(salvo)
          if (parsed.length > 0) {
            setMensagens(parsed)
            setInicializado(true)
            return
          }
        } catch { /* ignora */ }
      }
      // Sem histórico — mensagem de boas-vindas
      setMensagens([MSG_BOAS_VINDAS])
    }
    setInicializado(true)
  }, [])

  // Salva mensagens no localStorage sempre que mudam (após inicializado)
  useEffect(() => {
    if (!inicializado || mensagens.length === 0) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mensagens))
  }, [mensagens, inicializado])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  const enviar = useCallback(async (texto?: string) => {
    const msg = (texto || input).trim()
    if (!msg || carregando) return

    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const novaMensagem: Mensagem = {
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    }

    const mensagensAtualizadas = [...mensagens, novaMensagem]
    setMensagens(mensagensAtualizadas)
    setCarregando(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: msg,
          contexto: contextoInicial,
        }),
      })

      if (!res.ok) throw new Error('Erro na API')

      const data = await res.json()
      const resposta: Mensagem = {
        role: 'assistant',
        content: data.resposta || 'Não consegui processar sua pergunta. Tente novamente.',
        timestamp: new Date().toISOString(),
      }
      setMensagens(prev => [...prev, resposta])
    } catch {
      const erro: Mensagem = {
        role: 'assistant',
        content: '⚠️ Não consegui conectar ao servidor. Verifique se o Python está rodando e tente novamente.',
        timestamp: new Date().toISOString(),
      }
      setMensagens(prev => [...prev, erro])
    } finally {
      setCarregando(false)
    }
  }, [input, carregando, contextoInicial, mensagens])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  function novaConversa() {
    const boasVindas: Mensagem = {
      role: 'assistant',
      content: 'Olá! Sou o **SoloBot**, seu agrônomo virtual. Como posso ajudar sua plantação hoje?',
      timestamp: new Date().toISOString(),
    }
    setMensagens([boasVindas])
    setContextoInicial('')
    localStorage.setItem(STORAGE_KEY, JSON.stringify([boasVindas]))
  }

  const temMensagensDoUsuario = mensagens.some(m => m.role === 'user')

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--creme)',
      overflow: 'hidden',
    }}>

      {/* HEADER */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--creme-mid)',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'var(--verde)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', flexShrink: 0,
        }}>
          🤖
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--verde)' }}>SoloBot</div>
          <div style={{ fontSize: '12px', color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: '#4CAF50', display: 'inline-block',
              animation: 'pulse 2s infinite',
            }} />
            Agrônomo virtual online
          </div>
        </div>

        {temMensagensDoUsuario && (
          <button
            onClick={novaConversa}
            style={{
              marginLeft: 'auto', padding: '6px 14px',
              background: 'var(--creme)', border: '1.5px solid var(--creme-mid)',
              borderRadius: '100px', fontSize: '12px', fontWeight: 500,
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            Nova conversa
          </button>
        )}
      </div>

      {/* MENSAGENS */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* Sugestões iniciais */}
        {!temMensagensDoUsuario && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '10px',
            justifyContent: 'center', marginTop: '8px',
          }}>
            {SUGESTOES.map((s, i) => (
              <button
                key={i}
                onClick={() => enviar(s)}
                style={{
                  padding: '10px 16px',
                  background: '#fff',
                  border: '1.5px solid var(--creme-mid)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px', color: 'var(--text-main)',
                  cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: 'var(--shadow-sm)',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = 'var(--laranja)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'var(--creme-mid)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Mensagens */}
        {mensagens.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
              gap: '12px',
              alignItems: 'flex-start',
              maxWidth: '780px',
              width: '100%',
              margin: '0 auto',
            }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: m.role === 'user' ? 'var(--laranja)' : 'var(--verde)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', color: '#fff', fontWeight: 700,
            }}>
              {m.role === 'user' ? '👤' : '🤖'}
            </div>

            <div style={{
              maxWidth: 'calc(100% - 44px)',
              padding: '14px 18px',
              borderRadius: m.role === 'user'
                ? '18px 4px 18px 18px'
                : '4px 18px 18px 18px',
              background: m.role === 'user' ? 'var(--laranja)' : '#fff',
              color: m.role === 'user' ? '#fff' : 'var(--text-main)',
              fontSize: '14px', lineHeight: '1.6',
              boxShadow: 'var(--shadow-sm)',
            }}>
              {m.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: formatMarkdown(m.content) }} />
              ) : (
                <span>{m.content}</span>
              )}
              <div style={{
                fontSize: '11px', marginTop: '6px', opacity: 0.6,
                textAlign: m.role === 'user' ? 'right' : 'left',
              }}>
                {new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {carregando && (
          <div style={{
            display: 'flex', gap: '12px', alignItems: 'flex-start',
            maxWidth: '780px', width: '100%', margin: '0 auto',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--verde)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '14px',
            }}>
              🤖
            </div>
            <div style={{
              padding: '16px 20px', borderRadius: '4px 18px 18px 18px',
              background: '#fff', boxShadow: 'var(--shadow-sm)',
              display: 'flex', gap: '5px', alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'var(--verde)', display: 'inline-block',
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div style={{
        padding: '16px 24px 20px',
        background: '#fff',
        borderTop: '1px solid var(--creme-mid)',
        flexShrink: 0,
      }}>
        <div
          style={{
            maxWidth: '780px', margin: '0 auto',
            display: 'flex', gap: '10px', alignItems: 'flex-end',
            background: 'var(--creme)',
            border: '1.5px solid var(--creme-mid)',
            borderRadius: '14px',
            padding: '10px 14px',
            transition: 'border-color 0.2s',
          }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--laranja)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--creme-mid)'}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre sua plantação... (Enter para enviar, Shift+Enter para nova linha)"
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              resize: 'none', fontFamily: 'Poppins, sans-serif',
              fontSize: '14px', color: 'var(--text-main)',
              lineHeight: '1.5', minHeight: '24px', maxHeight: '160px',
            }}
          />
          <button
            onClick={() => enviar()}
            disabled={!input.trim() || carregando}
            style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: input.trim() && !carregando ? 'var(--verde)' : 'var(--creme-mid)',
              border: 'none', cursor: input.trim() && !carregando ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', transition: 'background 0.2s',
            }}
          >
            ↑
          </button>
        </div>
        <p style={{
          textAlign: 'center', fontSize: '11px',
          color: 'var(--text-muted)', marginTop: '8px',
        }}>
          SoloBot pode cometer erros. Consulte um agrônomo para decisões importantes.
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}