import { NextResponse } from 'next/server';
import { pool } from '@/app/lib/db';
import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_super_secreta';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, senha } = body;

    if (!email || !senha) {
      return NextResponse.json({ message: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ? LIMIT 1', [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 401 });
    }

    const user = rows[0];
    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      return NextResponse.json({ message: 'Senha incorreta' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = NextResponse.json({
      message: 'Login realizado com sucesso!',
      token,
      user: { email: user.email, uf: user.uf, cidade: user.cidade }
    }, { status: 200 });

    response.cookies.set('auth_token', token, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24
    });

    return response;

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Erro interno no servidor' }, { status: 500 });
  }
}