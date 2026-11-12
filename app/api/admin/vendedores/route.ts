import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const TABLA = 'vendedores_oportunidades'
const UUID_RE = /^[0-9a-f-]{36}$/i

/** Deja solo dígitos. Si viene un celular argentino sin código de país (10 dígitos), le agrega 549. */
function normalizarWhatsapp(v: unknown): string | null {
  if (typeof v !== 'string') return null
  let d = v.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 10) d = '549' + d
  return /^[0-9]{8,15}$/.test(d) ? d : null
}

/** Lista todos los vendedores (también los ocultos). */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  const { data, error } = await supabaseAdmin().from(TABLA).select('*').order('orden').order('created_at')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

/** Crea (sin id) o actualiza (con id) un vendedor. */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
  }

  const cambios: Record<string, unknown> = {}
  if ('nombre' in body) {
    const nombre = typeof body.nombre === 'string' ? body.nombre.trim().slice(0, 80) : ''
    if (!nombre) return NextResponse.json({ ok: false, error: 'Falta el nombre' }, { status: 400 })
    cambios.nombre = nombre
  }
  if ('whatsapp' in body) {
    const wa = normalizarWhatsapp(body.whatsapp)
    if (!wa) return NextResponse.json({ ok: false, error: 'WhatsApp inválido. Ej: 11 3100-7959 o 5491131007959' }, { status: 400 })
    cambios.whatsapp = wa
  }
  if ('activo' in body) {
    if (typeof body.activo !== 'boolean') return NextResponse.json({ ok: false, error: 'Dato inválido' }, { status: 400 })
    cambios.activo = body.activo
  }
  if ('orden' in body) {
    if (!Number.isInteger(body.orden)) return NextResponse.json({ ok: false, error: 'Dato inválido' }, { status: 400 })
    cambios.orden = body.orden
  }

  const db = supabaseAdmin()
  if (body.id) {
    if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return NextResponse.json({ ok: false, error: 'Id inválido' }, { status: 400 })
    if (!Object.keys(cambios).length) return NextResponse.json({ ok: false, error: 'Nada para guardar' }, { status: 400 })
    const { data, error } = await db.from(TABLA).update(cambios).eq('id', body.id).select().single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data })
  }

  if (!cambios.nombre || !cambios.whatsapp) {
    return NextResponse.json({ ok: false, error: 'Completá nombre y WhatsApp' }, { status: 400 })
  }
  const { data: ult } = await db.from(TABLA).select('orden').order('orden', { ascending: false }).limit(1).maybeSingle()
  const { data, error } = await db.from(TABLA)
    .insert({ ...cambios, orden: (ult?.orden ?? 0) + 1 })
    .select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

/** Borra un vendedor. Los pedidos viejos conservan su nombre. */
export async function DELETE(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  let id = ''
  try { id = String((await req.json()).id || '') } catch {}
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: false, error: 'Id inválido' }, { status: 400 })
  const { error } = await supabaseAdmin().from(TABLA).delete().eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
