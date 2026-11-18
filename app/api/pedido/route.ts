import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireCliente } from '@/lib/clienteSession'

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : null)

/** Registra la consulta que el distribuidor manda por WhatsApp, con su nombre. */
export async function POST(req: Request) {
  const r = await requireCliente()
  if ('denied' in r) return r.denied

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
  }
  if (!Array.isArray(body?.items) || !body.items.length || body.items.length > 200) {
    return NextResponse.json({ ok: false, error: 'Pedido vacío' }, { status: 400 })
  }

  const items = body.items.map((i: any) => ({
    id: str(i?.id, 120),
    nombre: str(i?.nombre),
    lote: str(i?.lote, 60),
    qty: Math.max(0, Math.round(num(i?.qty) ?? 0)),
    precio_outlet: num(i?.precio_outlet),
    promo: str(i?.promo, 40),
    subtotal: num(i?.subtotal) ?? 0,
  }))

  const { error } = await supabaseAdmin().from('pedidos_oportunidades').insert({
    vendedor: str(body.vendedor, 80) || '—',
    items,
    total: num(body.total) ?? 0,
    cliente_id: r.cliente.id,
    cliente_nombre: r.cliente.nombre || null,
    cliente_ident: r.cliente.ident || null,
  })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
