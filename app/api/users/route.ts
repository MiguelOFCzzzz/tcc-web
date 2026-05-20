import { NextResponse } from 'next/server';
import { pool } from '@/app/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, uf, cidade } = body;

    if (!email || !password || !uf || !cidade) {
      return NextResponse.json({ message: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    const [existing]: any = await pool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1', [email]
    );
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Este e-mail já está cadastrado' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (email, senha, uf, cidade) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, uf, cidade]
    );

    return NextResponse.json({ message: 'Usuário cadastrado com sucesso!' }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Erro interno ao salvar o usuário' }, { status: 500 });
  }
}