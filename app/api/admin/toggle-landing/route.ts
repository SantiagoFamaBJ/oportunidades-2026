import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, COOKIE_NAME } from '@/lib/adminSession'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!verifyToken(token)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let valor: boolean
  try {
    const body = await req.json()
    if (typeof body.valor !== 'boolean') throw new Error()
    valor = body.valor
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { error } = await supabaseAdmin()
    .from('oportunidades_config')
    .update({ landing_activa: valor })
    .eq('id', 1)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
