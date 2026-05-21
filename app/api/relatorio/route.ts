import { NextResponse } from 'next/server'

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const res = await fetch(`${PYTHON_API}/enviar-relatorio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      return NextResponse.json({ message: 'Erro ao enviar relatório.' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data, { status: 200 })

  } catch (error) {
    console.error('[/api/relatorio] Erro:', error)
    return NextResponse.json(
      { message: 'Não foi possível conectar ao servidor Python.' },
      { status: 503 }
    )
  }
}