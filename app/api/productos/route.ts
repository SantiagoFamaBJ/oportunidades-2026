import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireCliente, registrarVisitaSiCorresponde } from '@/lib/clienteSession'

export const dynamic = 'force-dynamic'

/** Productos visibles, solo para distribuidores habilitados (o el admin). */
export async function GET() {
  const r = await requireCliente()
  if ('denied' in r) return r.denied
  await registrarVisitaSiCorresponde(r.cliente)

  const db = supabaseAdmin()
  const [{ data: productos, error }, { data: fotos }] = await Promise.all([
    db.from('productos_oportunidades').select('*').eq('activo', true).order('fecha_venc', { ascending: true }),
    db.from('fotos_productos').select('codigo, imagen_url').neq('origen', 'descartada'),
  ])
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const fotoDe: Record<string, string> = {}
  for (const f of fotos || []) fotoDe[f.codigo] = f.imagen_url
  const data = (productos || []).map(p => ({ ...p, imagen_url: fotoDe[p.codigo] ?? null }))

  return NextResponse.json(
    { ok: true, data, cliente: r.cliente.nombre ? { nombre: r.cliente.nombre, esAdmin: r.cliente.esAdmin } : null },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
