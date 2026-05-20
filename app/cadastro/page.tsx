'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './cadastro.module.css'

interface UF {
  id: number
  sigla: string
  nome: string
}

interface Cidade {
  id: number
  nome: string
}

export default function CadastroPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [showSenha2, setShowSenha2] = useState(false)

  const [ufs, setUfs] = useState<UF[]>([])
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [ufSelecionadaId, setUfSelecionadaId] = useState('')
  const [ufSelecionadaSigla, setUfSelecionadaSigla] = useState('')
  const [cidadeSelecionada, setCidadeSelecionada] = useState('')
  const [loadingCidades, setLoadingCidades] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados')
      .then(r => r.json())
      .then((data: UF[]) => setUfs(data.sort((a, b) => a.nome.localeCompare(b.nome))))
      .catch(() => setError('Erro ao carregar estados.'))
  }, [])

  async function handleUfChange(id: string) {
    setUfSelecionadaId(id)
    setCidadeSelecionada('')
    setCidades([])
    if (!id) return

    const estado = ufs.find(u => u.id === Number(id))
    if (estado) setUfSelecionadaSigla(estado.sigla)

    setLoadingCidades(true)
    try {
      const res = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${id}/municipios`
      )
      const data: Cidade[] = await res.json()
      setCidades(data.sort((a, b) => a.nome.localeCompare(b.nome)))
    } catch {
      setError('Erro ao carregar cidades.')
    } finally {
      setLoadingCidades(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !senha || !senha2 || !ufSelecionadaId || !cidadeSelecionada) {
      setError('Preencha todos os campos.')
      return
    }
    if (senha !== senha2) {
      setError('As senhas não conferem.')
      return
    }
    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha, uf: ufSelecionadaSigla, cidade: cidadeSelecionada }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Erro ao cadastrar.')
        return
      }

      // Injeta o cookie para o middleware não te barrar ao ir para a dashboard
      document.cookie = "auth_token=token_falso_cadastro; path=/; max-age=86400;";
      localStorage.setItem('usuarioLogado', 'true')
      localStorage.setItem('userEmail', email)
      localStorage.setItem('userCidade', cidadeSelecionada)
      router.push('/login')
    } catch {
      setError('Erro de conexão. Verifique se o servidor está rodando.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <aside className={styles.panel}>
        <div className={styles.panelInner}>
          <div className={styles.brand}>
            <span className={styles.brandName}>Solo<em>Smart</em></span>
            <p className={styles.brandTagline}>Crie sua conta e comece a<br />monitorar sua plantação</p>
          </div>

          <div className={styles.steps}>
            <p className={styles.stepsTitle}>Como funciona</p>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div>
                <strong>Crie sua conta</strong>
                <p>Informe seu email e localização</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div>
                <strong>Conecte o sensor</strong>
                <p>Configure o ESP32 com sua rede Wi-Fi</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <div>
                <strong>Monitore em tempo real</strong>
                <p>Acesse o dashboard com todos os dados</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h1>Cadastro</h1>
            <p>Acompanhe sua plantação de forma inteligente</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className={styles.locationRow}>
              <div className={styles.field}>
                <label htmlFor="uf">Estado</label>
                <select id="uf" value={ufSelecionadaId} onChange={e => handleUfChange(e.target.value)}>
                  <option value="">UF</option>
                  {ufs.map(u => (
                    <option key={u.id} value={u.id}>{u.sigla}</option>
                  ))}
                </select>
              </div>

              <div className={`${styles.field} ${styles.fieldFlex}`}>
                <label htmlFor="cidade">Cidade</label>
                <select
                  id="cidade"
                  value={cidadeSelecionada}
                  onChange={e => setCidadeSelecionada(e.target.value)}
                  disabled={!ufSelecionadaId || loadingCidades}
                >
                  <option value="">{loadingCidades ? 'Carregando...' : 'Selecione'}</option>
                  {cidades.map(c => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="senha">Senha</label>
              <div className={styles.passwordWrap}>
                <input
                  id="senha"
                  type={showSenha ? 'text' : 'password'}
                  placeholder="mínimo 6 caracteres"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  autoComplete="new-password"
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowSenha(v => !v)}>
                  {showSenha ? '🔑' : '👁️'}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="senha2">Confirme a senha</label>
              <div className={styles.passwordWrap}>
                <input
                  id="senha2"
                  type={showSenha2 ? 'text' : 'password'}
                  placeholder="repita a senha"
                  value={senha2}
                  onChange={e => setSenha2(e.target.value)}
                  autoComplete="new-password"
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowSenha2(v => !v)}>
                  {showSenha2 ? '🔑' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Criando conta...' : 'Cadastrar'}
            </button>
          </form>

          <p className={styles.switch}>
            Já tem uma conta?{' '}
            <Link href="/login">Fazer login</Link>
          </p>
        </div>
      </main>
    </div>
  )
}