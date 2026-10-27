import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabase'

// Campos que se pueden editar desde el modal, con su tipo
const CAMPOS: Record<string, 'string' | 'string|null' | 'number' | 'boolean'> = {
  nombre: 'string',
  lote: 'string',
  categoria: 'string|null',
  promo: 'string|null',
  stock: 'number',
  precio_outlet: 'number',
  precio_publico: 'number',
  activo: 'boolean',
  consultar_precio: 'boolean',
}

export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
  }
  const id = typeof body?.id === 'string' ? body.id : null
  if (!id) return NextResponse.json({ ok: false, error: 'Falta el id' }, { status: 400 })

  const update: Record<string, unknown> = {}
  for (const [k, tipo] of Object.entries(CAMPOS)) {
    if (!(k in body)) continue
    const v = body[k]
    const ok =
      tipo === 'number' ? typeof v === 'number' && Number.isFinite(v) :
      tipo === 'boolean' ? typeof v === 'boolean' :
      tipo === 'string' ? typeof v === 'string' :
      v === null || typeof v === 'string'
    if (!ok) return NextResponse.json({ ok: false, error: `Campo inválido: ${k}` }, { status: 400 })
    update[k] = typeof v === 'string' ? v.slice(0, 300) : v
  }
  if (!Object.keys(update).length) return NextResponse.json({ ok: false, error: 'Nada para guardar' }, { status: 400 })

  const { error, data } = await supabaseAdmin()
    .from('productos_oportunidades')
    .update(update)
    .eq('id', id)
    .select()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ ok: false, error: 'No se encontró el producto' }, { status: 404 })
  return NextResponse.json({ ok: true, data })
}
