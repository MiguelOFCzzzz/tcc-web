'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !senha) {
      setError('Preencha todos os campos.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Email ou senha inválidos.')
        return
      }

      localStorage.setItem('usuarioLogado', 'true')
      localStorage.setItem('userEmail', email)
      // Cookie para o middleware conseguir proteger as rotas
      document.cookie = 'usuarioLogado=true; path=/; max-age=86400'
      router.push('/dashboard')
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
            <p className={styles.brandTagline}>Monitore sua plantação<br />de forma inteligente</p>
          </div>

          <div className={styles.features}>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}></span>
              <div>
                <strong>Umidade em tempo real</strong>
                <p>Leituras a cada 5 minutos direto do sensor ESP32</p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}></span>
              <div>
                <strong>Clima integrado</strong>
                <p>Temperatura, vento e precipitação da sua região</p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}></span>
              <div>
                <strong>Solo IA</strong>
                <p>Diagnóstico inteligente da saúde do seu solo</p>
              </div>
            </div>
          </div>

          <div className={styles.panelDeco} aria-hidden="true">
            <div className={styles.decoCircle1} />
            <div className={styles.decoCircle2} />
          </div>
        </div>
      </aside>

      <main className={styles.formSide}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h1>Entrar</h1>
            <p>Seja bem-vindo de volta!</p>
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

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="senha">Senha</label>
                <Link href="/redefsenha" className={styles.forgot}>Esqueci minha senha</Link>
              </div>
              <div className={styles.passwordWrap}>
                <input
                  id="senha"
                  type={showSenha ? 'text' : 'password'}
                  placeholder="sua senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowSenha(v => !v)}
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showSenha ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className={styles.switch}>
            Não tem uma conta?{' '}
            <Link href="/cadastro">Cadastre-se</Link>
          </p>
        </div>
      </main>
    </div>
  )
}