import { NextResponse } from 'next/server'

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const res = await fetch(`${PYTHON_API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensagem: body.mensagem,
        contexto: body.contexto || '',
      }),
    })

    if (!res.ok) {
      return NextResponse.json(
        { resposta: 'Erro ao conectar com o SoloBot. Tente novamente.' },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data, { status: 200 })

  } catch (error) {
    console.error('[/api/chat] Erro:', error)
    return NextResponse.json(
      { resposta: 'Não foi possível conectar ao servidor Python. Verifique se está rodando na porta 8000.' },
      { status: 503 }
    )
  }
}