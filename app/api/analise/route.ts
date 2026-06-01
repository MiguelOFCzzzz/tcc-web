import { NextResponse } from 'next/server'

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const email = formData.get('email')

    if (!email) {
      return NextResponse.json(
        { message: 'Email é obrigatório para análise.' },
        { status: 400 }
      )
    }

    const res = await fetch(
      `${PYTHON_API}/analisar?email=${encodeURIComponent(String(email))}`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { message: `Erro no servidor Python: ${res.status} — ${text}` },
        { status: res.status }
      )
    }

    const data = await res.json()

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('[/api/analise] Erro ao conectar com Python:', error)

    return NextResponse.json(
      {
        message:
          'Não foi possível conectar ao servidor Python. Verifique se está rodando na porta 8000.',
      },
      { status: 503 }
    )
  }
} 