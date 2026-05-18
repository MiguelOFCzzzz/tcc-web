import { NextResponse } from 'next/server';
import { pool } from '@/app/lib/db'; // Importa a conexão que criamos no Passo 2
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'E-mail e senha são obrigatórios' }, { status: 400 });
    }

    // 1. Executa a query SQL puro para buscar o usuário
    // O uso de '?' previne ataques de SQL Injection
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    // 2. Verifica se encontrou algum registro
    if (rows.length === 0) {
      return NextResponse.json({ message: 'E-mail ou senha incorretos' }, { status: 401 });
    }

    const user = rows[0];

    // 3. Verifica a senha
    // IMPORTANTE: Se o Ionic salva a senha criptografada (ex: Bcrypt), 
    // você precisará usar a biblioteca 'bcrypt' para comparar aqui em vez de '==='
    if (user.senha !== password) {
      return NextResponse.json({ message: 'E-mail ou senha incorretos' }, { status: 401 });
    }

    // 4. Login bem-sucedido: Gera a resposta e injeta o cookie para o middleware
    const response = NextResponse.json(
      { 
        message: 'Login bem-sucedido', 
        user: { email: user.email, uf: user.uf, city: user.cidade } 
      },
      { status: 200 }
    );

    // Configura o cookie exatamente com o nome que seu middleware espera (ex: 'auth_token')
    response.cookies.set('auth_token', 'token_gerado_ou_id_' + user.id, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 // Expira em 1 dia
    });

    return response;

  } catch (error) {
    console.error('Erro na API de login:', error);
    return NextResponse.json({ message: 'Erro interno no servidor' }, { status: 500 });
  }
}