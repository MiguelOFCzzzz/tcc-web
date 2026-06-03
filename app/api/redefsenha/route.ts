import { NextResponse } from 'next/server'
import { pool } from '@/app/lib/db'
import bcrypt from 'bcryptjs'

export async function PUT(request: Request) {
  try {
    const { email, novaSenha } = await request.json()

    if (!email || !novaSenha) {
      return NextResponse.json({ message: 'Email e nova senha são obrigatórios.' }, { status: 400 })
    }

    if (novaSenha.length < 6) {
      return NextResponse.json({ message: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 })
    }

    const [rows]: any = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email])

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Email não encontrado.' }, { status: 404 })
    }

    const hash = await bcrypt.hash(novaSenha, 10)
    await pool.query('UPDATE users SET senha = ? WHERE email = ?', [hash, email])

    return NextResponse.json({ message: 'Senha redefinida com sucesso.' }, { status: 200 })
  } catch (error) {
    console.error('[/api/redefsenha]', error)
    return NextResponse.json({ message: 'Erro interno.' }, { status: 500 })
  }
}