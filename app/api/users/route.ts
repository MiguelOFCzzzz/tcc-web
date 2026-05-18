import { NextResponse } from 'next/server';
import { pool } from '@/app/lib/db'; // Importa a conexão com o MySQL

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, uf, cidade } = body;

    // 1. Validação básica dos campos recebidos do front-end
    if (!email || !password || !uf || !cidade) {
      return NextResponse.json(
        { message: 'Todos os campos são obrigatórios (E-mail, senha, UF e cidade)' },
        { status: 400 }
      );
    }

    // 2. Verifica se o e-mail já está cadastrado no banco (para evitar erro de duplicidade)
    const [existingUsers]: any = await pool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { message: 'Este e-mail já está cadastrado' },
        { status: 409 } // Código 409: Conflito
      );
    }

    // 3. Insere o novo usuário no MySQL puro
    // IMPORTANTE: Se o seu projeto Ionic criptografa a senha antes de salvar,
    // você precisará usar a biblioteca 'bcrypt' aqui para gerar o hash da senha também!
    await pool.query(
      'INSERT INTO users (email, senha, uf, cidade) VALUES (?, ?, ?, ?)',
      [email, password, uf, cidade]
    );

    // 4. Cadastro realizado com sucesso!
    return NextResponse.json(
      { message: 'Usuário cadastrado com sucesso!' },
      { status: 201 } // Código 201: Criado
    );

  } catch (error) {
    console.error('Erro na API de cadastro (users):', error);
    return NextResponse.json(
      { message: 'Erro interno ao salvar o usuário' },
      { status: 500 }
    );
  }
}