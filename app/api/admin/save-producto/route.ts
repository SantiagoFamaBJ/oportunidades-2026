import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, COOKIE_NAME } from '@/lib/adminSession'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!verifyToken(token)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { id, stock, imagen_url, activo, precio_outlet, precio_publico, promo, lote, categoria, nombre } = body
  if (!id) return NextResponse.json({ ok: false }, { status: 400 })

  const { error, data } = await supabaseAdmin()
    .from('productos_oportunidades')
    .update({ stock, imagen_url, activo, precio_outlet, precio_publico, promo, lote, categoria, nombre })
    .eq('id', id)
    .select()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data })
}
