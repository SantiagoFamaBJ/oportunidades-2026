import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_FILAS = 2000

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : null)
const numOr = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

/** Solo se guardan estas columnas, con el tipo correcto: nada que mande el navegador pasa sin filtrar. */
function limpiarFila(f: any) {
  const id = str(f?.id, 120)
  const codigo = str(f?.codigo, 40)
  const fecha_venc = str(f?.fecha_venc, 10)
  if (!id || !codigo || !fecha_venc || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_venc)) return null
  return {
    id,
    codigo,
    nombre: str(f.nombre) || codigo,
    lote: str(f.lote, 60) || '',
    fecha_venc,
    stock: Math.max(0, Math.round(numOr(f.stock, 0))),
    precio_publico: Math.max(0, numOr(f.precio_publico, 0)),
    precio_outlet: Math.max(0, numOr(f.precio_outlet, 0)),
    descuento_pct: typeof f.descuento_pct === 'number' && Number.isFinite(f.descuento_pct) ? Math.round(f.descuento_pct) : null,
    consultar_precio: f.consultar_precio === true,
    es_urgente: f.es_urgente === true,
    categoria: str(f.categoria, 80),
    promo: str(f.promo, 40),
    activo: true,
  }
}

/** Aplica la lista del mes: upsert de las filas y oculta las que ya no están. */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
  }
  if (!Array.isArray(body?.filas) || !Array.isArray(body?.ocultar)) {
    return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
  }
  if (body.filas.length > MAX_FILAS || body.ocultar.length > MAX_FILAS) {
    return NextResponse.json({ ok: false, error: 'Demasiadas filas' }, { status: 400 })
  }

  const filas = body.filas.map(limpiarFila)
  if (filas.some((f: unknown) => f === null)) {
    return NextResponse.json({ ok: false, error: 'Hay filas con código, id o fecha inválidos' }, { status: 400 })
  }
  const ocultar = body.ocultar.filter((x: unknown) => typeof x === 'string').slice(0, MAX_FILAS) as string[]

  const db = supabaseAdmin()
  for (let i = 0; i < filas.length; i += 100) {
    const { error } = await db.from('productos_oportunidades').upsert(filas.slice(i, i + 100), { onConflict: 'id' })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  for (let i = 0; i < ocultar.length; i += 100) {
    const { error } = await db.from('productos_oportunidades').update({ activo: false }).in('id', ocultar.slice(i, i + 100))
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, guardados: filas.length, ocultados: ocultar.length })
}
