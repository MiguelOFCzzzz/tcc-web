import { NextResponse } from 'next/server';
import { pool } from '@/app/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_super_secreta';

// ESP32 envia dados: POST /api/sensor
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { umidade, temperatura } = body;

    await pool.query(
      'INSERT INTO sensor_data (umidade, temperatura, created_at) VALUES (?, ?, NOW())',
      [umidade ?? null, temperatura ?? null]
    );

    console.log(`[ESP32] Dado recebido — umidade: ${umidade}, temperatura: ${temperatura}`)
    return NextResponse.json({ message: 'Dados salvos' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Erro ao salvar dados' }, { status: 500 });
  }
}

// Frontend lê dados: GET /api/sensor (requer JWT)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ message: 'Token não fornecido' }, { status: 401 });
    }

    jwt.verify(token, JWT_SECRET);

    const [rows]: any = await pool.query(
      'SELECT * FROM sensor_data ORDER BY created_at DESC LIMIT 1'
    );

    return NextResponse.json({ data: rows[0] || null }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Token inválido ou erro interno' }, { status: 401 });
  }
}