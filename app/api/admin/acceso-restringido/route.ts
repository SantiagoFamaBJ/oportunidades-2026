import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** Estado del interruptor "Pedir ingreso". */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  const { data } = await supabaseAdmin().from('oportunidades_config').select('acceso_restringido').eq('id', 1).maybeSingle()
  return NextResponse.json({ ok: true, valor: data?.acceso_restringido === true })
}

/** Prende o apaga el pedido de ingreso. No deja prenderlo sin distribuidores habilitados. */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  let valor: unknown
  try { valor = (await req.json()).valor } catch {}
  if (typeof valor !== 'boolean') return NextResponse.json({ ok: false, error: 'Dato inválido' }, { status: 400 })

  const db = supabaseAdmin()
  if (valor) {
    const { count } = await db.from('clientes_oportunidades').select('id', { count: 'exact', head: true }).eq('activo', true)
    if (!count) return NextResponse.json({ ok: false, error: 'Primero cargá la lista de distribuidores: si no, nadie podría entrar.' }, { status: 400 })
  }
  const { error } = await db.from('oportunidades_config').update({ acceso_restringido: valor }).eq('id', 1)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, valor })
}
