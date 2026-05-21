'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UserInfo {
  email: string
  cidade: string
  uf: string
}

type Aba = 'perfil' | 'sensor' | 'alertas' | 'conta'

const LIMIARES_PADRAO = { seco: 30, umido: 60 }

export default function ConfiguracoesPage() {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>('perfil')
  const [user, setUser] = useState<UserInfo>({ email: '', cidade: '', uf: '' })

  // Perfil
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [msgPerfil, setMsgPerfil] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  // Sensor
  const [limiarSeco, setLimiarSeco] = useState(LIMIARES_PADRAO.seco)
  const [limiarUmido, setLimiarUmido] = useState(LIMIARES_PADRAO.umido)
  const [intervaloLeitura, setIntervaloLeitura] = useState(5)
  const [salvandoSensor, setSalvandoSensor] = useState(false)
  const [msgSensor, setMsgSensor] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  // Alertas
  const [alertaSeco, setAlertaSeco] = useState(true)
  const [alertaUmido, setAlertaUmido] = useState(true)
  const [alertaEmail, setAlertaEmail] = useState(true)
  const [salvandoAlertas, setSalvandoAlertas] = useState(false)
  const [msgAlertas, setMsgAlertas] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    setUser({
      email: localStorage.getItem('userEmail') || '',
      cidade: localStorage.getItem('userCidade') || '',
      uf: localStorage.getItem('userUF') || '',
    })
    // Carrega configs salvas
    const s = localStorage.getItem('config_sensor')
    if (s) {
      try {
        const cfg = JSON.parse(s)
        if (cfg.limiarSeco) setLimiarSeco(cfg.limiarSeco)
        if (cfg.limiarUmido) setLimiarUmido(cfg.limiarUmido)
        if (cfg.intervaloLeitura) setIntervaloLeitura(cfg.intervaloLeitura)
      } catch { }
    }
    const a = localStorage.getItem('config_alertas')
    if (a) {
      try {
        const cfg = JSON.parse(a)
        setAlertaSeco(cfg.alertaSeco ?? true)
        setAlertaUmido(cfg.alertaUmido ?? true)
        setAlertaEmail(cfg.alertaEmail ?? true)
      } catch { }
    }
  }, [])

  async function salvarSenha() {
    if (!novaSenha || novaSenha !== confirmaSenha) {
      setMsgPerfil({ tipo: 'erro', texto: 'As senhas não conferem.' })
      return
    }
    if (novaSenha.length < 6) {
      setMsgPerfil({ tipo: 'erro', texto: 'A senha deve ter pelo menos 6 caracteres.' })
      return
    }
    setSalvandoPerfil(true)
    try {
      const res = await fetch('http://localhost:3001/api/redefsenha', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, novaSenha }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsgPerfil({ tipo: 'ok', texto: 'Senha alterada com sucesso!' })
        setNovaSenha('')
        setConfirmaSenha('')
      } else {
        setMsgPerfil({ tipo: 'erro', texto: data.message || 'Erro ao alterar senha.' })
      }
    } catch {
      setMsgPerfil({ tipo: 'erro', texto: 'Erro de conexão com o servidor.' })
    } finally {
      setSalvandoPerfil(false)
      setTimeout(() => setMsgPerfil(null), 4000)
    }
  }

  function salvarSensor() {
    setSalvandoSensor(true)
    localStorage.setItem('config_sensor', JSON.stringify({ limiarSeco, limiarUmido, intervaloLeitura }))
    setTimeout(() => {
      setSalvandoSensor(false)
      setMsgSensor({ tipo: 'ok', texto: 'Configurações do sensor salvas!' })
      setTimeout(() => setMsgSensor(null), 3000)
    }, 600)
  }

  function salvarAlertas() {
    setSalvandoAlertas(true)
    localStorage.setItem('config_alertas', JSON.stringify({ alertaSeco, alertaUmido, alertaEmail }))
    setTimeout(() => {
      setSalvandoAlertas(false)
      setMsgAlertas({ tipo: 'ok', texto: 'Preferências de alertas salvas!' })
      setTimeout(() => setMsgAlertas(null), 3000)
    }, 600)
  }

  function logout() {
    localStorage.clear()
    document.cookie = 'auth_token=; path=/; max-age=0'
    router.push('/login')
  }

  const abas: { id: Aba; label: string; icon: string }[] = [
    { id: 'perfil', label: 'Perfil', icon: '👤' },
    { id: 'sensor', label: 'Sensor', icon: '📡' },
    { id: 'alertas', label: 'Alertas', icon: '🔔' },
    { id: 'conta', label: 'Conta', icon: '⚙️' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>

      {/* HEADER */}
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--verde)', letterSpacing: '-0.5px' }}>Configurações</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Gerencie sua conta, sensor e preferências
        </p>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: '4px', background: '#fff', borderRadius: 'var(--radius-md)', padding: '6px', boxShadow: 'var(--shadow-sm)' }}>
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            flex: 1, padding: '10px 0', borderRadius: 'var(--radius-sm)', border: 'none',
            background: aba === a.id ? 'var(--verde)' : 'transparent',
            color: aba === a.id ? '#fff' : 'var(--text-muted)',
            fontWeight: 600, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'all 0.2s',
          }}>
            <span>{a.icon}</span> {a.label}
          </button>
        ))}
      </div>

      {/* PERFIL */}
      {aba === 'perfil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--verde)', marginBottom: '20px' }}>👤 Informações da Conta</h3>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'var(--laranja)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: '#fff', flexShrink: 0
              }}>
                {user.email ? user.email.slice(0, 2).toUpperCase() : 'SS'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--verde)' }}>{user.email || '—'}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {user.cidade && user.uf ? `${user.cidade} — ${user.uf}` : user.cidade || 'Localização não definida'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Email', value: user.email || '—' },
                { label: 'Cidade', value: user.cidade || '—' },
                { label: 'Estado (UF)', value: user.uf || '—' },
                { label: 'Plano', value: 'Gratuito' },
              ].map(f => (
                <div key={f.label} style={{ padding: '14px 16px', background: 'var(--creme)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{f.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alterar senha */}
          <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--verde)', marginBottom: '20px' }}>🔐 Alterar Senha</h3>

            {msgPerfil && (
              <div style={{
                marginBottom: '16px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px',
                background: msgPerfil.tipo === 'ok' ? 'rgba(76,175,80,0.08)' : '#fde8e8',
                border: `1px solid ${msgPerfil.tipo === 'ok' ? 'rgba(76,175,80,0.3)' : '#f5c0c0'}`,
                color: msgPerfil.tipo === 'ok' ? '#4CAF50' : '#c0392b', fontWeight: 600
              }}>
                {msgPerfil.tipo === 'ok' ? '✅' : '❌'} {msgPerfil.texto}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Nova senha', value: novaSenha, set: setNovaSenha },
                { label: 'Confirmar nova senha', value: confirmaSenha, set: setConfirmaSenha },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSenha ? 'text' : 'password'}
                      value={f.value}
                      onChange={e => f.set(e.target.value)}
                      placeholder="mínimo 6 caracteres"
                      style={{
                        width: '100%', height: '46px', background: '#fff',
                        border: '1.5px solid var(--creme-mid)', borderRadius: 'var(--radius-sm)',
                        padding: '0 44px 0 14px', fontSize: '14px', color: 'var(--text-main)',
                        outline: 'none', fontFamily: 'Poppins, sans-serif',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--laranja)'}
                      onBlur={e => e.target.style.borderColor = 'var(--creme-mid)'}
                    />
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="showSenha" checked={showSenha} onChange={e => setShowSenha(e.target.checked)} />
                <label htmlFor="showSenha" style={{ fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>Mostrar senhas</label>
              </div>

              <button onClick={salvarSenha} disabled={salvandoPerfil} style={{
                height: '46px', background: 'var(--laranja)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '14px', fontWeight: 600,
                cursor: salvandoPerfil ? 'not-allowed' : 'pointer', opacity: salvandoPerfil ? 0.7 : 1,
                alignSelf: 'flex-start', padding: '0 28px',
              }}>
                {salvandoPerfil ? 'Salvando...' : '💾 Salvar Nova Senha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SENSOR */}
      {aba === 'sensor' && (
        <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--verde)', marginBottom: '20px' }}>📡 Configurações do Sensor ESP32</h3>

          {msgSensor && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.3)', color: '#4CAF50', fontWeight: 600 }}>
              ✅ {msgSensor.texto}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Limiar Seco */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  🌵 Limiar Seco — abaixo disso: alerta de irrigação
                </label>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#d21717' }}>{limiarSeco}%</span>
              </div>
              <input type="range" min={10} max={50} value={limiarSeco}
                onChange={e => setLimiarSeco(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#d21717' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>10%</span><span>50%</span>
              </div>
            </div>

            {/* Limiar Úmido */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  💧 Limiar Úmido — acima disso: alerta de excesso
                </label>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0277BD' }}>{limiarUmido}%</span>
              </div>
              <input type="range" min={50} max={90} value={limiarUmido}
                onChange={e => setLimiarUmido(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#0277BD' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>50%</span><span>90%</span>
              </div>
            </div>

            {/* Prévia da faixa ideal */}
            <div style={{ padding: '14px 16px', background: 'rgba(76,175,80,0.06)', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: '#4CAF50' }}>✅ Faixa ideal configurada: </span>
              <span>{limiarSeco}% – {limiarUmido}%</span>
            </div>

            {/* Intervalo de leitura */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '10px' }}>
                ⏱️ Intervalo de Leitura do Sensor
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[1, 5, 10, 30, 60].map(v => (
                  <button key={v} onClick={() => setIntervaloLeitura(v)} style={{
                    padding: '8px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: 600,
                    border: '1.5px solid',
                    borderColor: intervaloLeitura === v ? 'var(--verde)' : 'var(--creme-mid)',
                    background: intervaloLeitura === v ? 'var(--verde)' : '#fff',
                    color: intervaloLeitura === v ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                    {v < 60 ? `${v} min` : '1 hora'}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Nota: O intervalo real depende do firmware do ESP32. Esta configuração serve como referência.
              </p>
            </div>

            <button onClick={salvarSensor} disabled={salvandoSensor} style={{
              height: '46px', background: 'var(--verde)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', alignSelf: 'flex-start', padding: '0 28px',
            }}>
              {salvandoSensor ? 'Salvando...' : '💾 Salvar Configurações'}
            </button>
          </div>
        </div>
      )}

      {/* ALERTAS */}
      {aba === 'alertas' && (
        <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--verde)', marginBottom: '20px' }}>🔔 Preferências de Alertas</h3>

          {msgAlertas && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.3)', color: '#4CAF50', fontWeight: 600 }}>
              ✅ {msgAlertas.texto}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                label: '🌵 Alerta de Solo Seco',
                descricao: `Notificar quando umidade cair abaixo de ${limiarSeco}%`,
                checked: alertaSeco,
                set: setAlertaSeco,
                cor: '#d21717',
              },
              {
                label: '💧 Alerta de Solo Úmido',
                descricao: `Notificar quando umidade passar de ${limiarUmido}%`,
                checked: alertaUmido,
                set: setAlertaUmido,
                cor: '#0277BD',
              },
              {
                label: '📧 Receber alertas por email',
                descricao: `Enviar notificações para ${user.email || 'seu email'}`,
                checked: alertaEmail,
                set: setAlertaEmail,
                cor: 'var(--laranja)',
              },
            ].map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '16px', borderRadius: 'var(--radius-sm)',
                background: a.checked ? `${a.cor}08` : 'var(--creme)',
                border: `1.5px solid ${a.checked ? `${a.cor}30` : 'var(--creme-mid)'}`,
                transition: 'all 0.2s', cursor: 'pointer',
              }} onClick={() => a.set(!a.checked)}>
                <div style={{
                  width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
                  background: a.checked ? a.cor : 'var(--creme-mid)',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: a.checked ? '23px' : '3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s',
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>{a.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{a.descricao}</div>
                </div>
                <span style={{
                  fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px',
                  background: a.checked ? `${a.cor}15` : 'var(--creme-mid)',
                  color: a.checked ? a.cor : 'var(--text-muted)',
                }}>
                  {a.checked ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}

            <button onClick={salvarAlertas} disabled={salvandoAlertas} style={{
              height: '46px', background: 'var(--laranja)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', alignSelf: 'flex-start', padding: '0 28px', marginTop: '8px',
            }}>
              {salvandoAlertas ? 'Salvando...' : '💾 Salvar Alertas'}
            </button>
          </div>
        </div>
      )}

      {/* CONTA */}
      {aba === 'conta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--verde)', marginBottom: '20px' }}>ℹ️ Sobre o SoloSmart</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Versão', value: '1.0.0' },
                { label: 'Plataforma', value: 'Next.js + FastAPI + ESP32' },
                { label: 'IA de Detecção', value: 'YOLO v8' },
                { label: 'Chat IA', value: 'Llama 3.1 via Groq' },
                { label: 'Clima', value: 'Open-Meteo API' },
                { label: 'Banco de dados', value: 'MySQL' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--creme)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{f.label}</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)', borderTop: '3px solid #d21717' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#d21717', marginBottom: '8px' }}>⚠️ Zona de Perigo</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Estas ações são irreversíveis. Prossiga com cuidado.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  if (confirm('Limpar todos os dados locais e sair?')) {
                    localStorage.clear()
                    document.cookie = 'auth_token=; path=/; max-age=0'
                    router.push('/login')
                  }
                }}
                style={{
                  padding: '10px 20px', background: 'rgba(210,23,23,0.08)',
                  color: '#d21717', border: '1.5px solid rgba(210,23,23,0.3)',
                  borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                🗑️ Limpar Dados Locais
              </button>
              <button
                onClick={logout}
                style={{
                  padding: '10px 20px', background: '#d21717',
                  color: '#fff', border: 'none',
                  borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                ⏻ Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}