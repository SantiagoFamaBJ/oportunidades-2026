import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, COOKIE_NAME } from '@/lib/adminSession'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_FIELDS = ['activo', 'es_urgente'] as const
type AllowedField = typeof ALLOWED_FIELDS[number]

export async function POST(req: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!verifyToken(token)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { id, field, value } = body
  if (!id || !ALLOWED_FIELDS.includes(field) || typeof value !== 'boolean') {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { error } = await supabaseAdmin()
    .from('productos_oportunidades')
    .update({ [field as AllowedField]: value })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
