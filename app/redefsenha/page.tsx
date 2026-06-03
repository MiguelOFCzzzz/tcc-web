'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../login/login.module.css'

export default function RedefSenhaPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!email || !novaSenha || !confirma) {
      setErro('Preencha todos os campos.')
      return
    }
    if (novaSenha !== confirma) {
      setErro('As senhas não conferem.')
      return
    }
    if (novaSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/redefsenha', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, novaSenha }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.message || 'Erro ao redefinir senha.')
        return
      }
      setOk(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setErro('Erro de conexão.')
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
            <p className={styles.brandTagline}>Redefina sua senha<br />para continuar</p>
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
            <h1>Redefinir Senha</h1>
            <p>Informe seu email e a nova senha</p>
          </div>

          {ok ? (
            <div style={{ background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.3)', color: '#4CAF50', borderRadius: '8px', padding: '16px', fontWeight: 600, fontSize: '14px' }}>
              ✅ Senha redefinida com sucesso! Redirecionando...
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {erro && <div className={styles.errorBanner}>{erro}</div>}

              <div className={styles.field}>
                <label>Email</label>
                <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div className={styles.field}>
                <label>Nova senha</label>
                <input type="password" placeholder="mínimo 6 caracteres" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
              </div>

              <div className={styles.field}>
                <label>Confirmar nova senha</label>
                <input type="password" placeholder="repita a senha" value={confirma} onChange={e => setConfirma(e.target.value)} />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Salvando...' : 'Redefinir Senha'}
              </button>
            </form>
          )}

          <p className={styles.switch}>
            Lembrou a senha? <Link href="/login">Fazer login</Link>
          </p>
        </div>
      </main>
    </div>
  )
}   