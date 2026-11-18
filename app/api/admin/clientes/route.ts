import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabase'
import { extraerEmails, normalizarCuit } from '@/lib/clientes'

export const dynamic = 'force-dynamic'
const TABLA = 'clientes_oportunidades'
const UUID_RE = /^[0-9a-f-]{36}$/i

type Fila = { nombre: string | null; emails: string[]; cuit: string | null }

function limpiarFila(f: any): Fila | null {
  const emails = extraerEmails(Array.isArray(f?.emails) ? f.emails.join(';') : f?.emails)
  const cuit = normalizarCuit(f?.cuit)
  if (!emails.length && !cuit) return null
  const nombre = typeof f?.nombre === 'string' && f.nombre.trim() ? f.nombre.trim().slice(0, 150) : null
  return { nombre, emails, cuit }
}

/** Lista de distribuidores habilitados (y deshabilitados). */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  const { data, error } = await supabaseAdmin().from(TABLA).select('*').order('nombre', { nullsFirst: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

/**
 * Dos usos:
 *  - { importar: Fila[], desactivarFaltantes: boolean } → aplica el Excel
 *  - { id?, nombre, emails, cuit, activo } → alta o edición manual de uno
 */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
  }
  const db = supabaseAdmin()

  // ── Importar Excel ──
  if (Array.isArray(body?.importar)) {
    if (body.importar.length > 10000) return NextResponse.json({ ok: false, error: 'Demasiadas filas' }, { status: 400 })
    const filas = body.importar.map(limpiarFila).filter(Boolean) as Fila[]
    if (!filas.length) return NextResponse.json({ ok: false, error: 'El Excel no tiene mails ni CUITs válidos' }, { status: 400 })

    const { data: actuales, error } = await db.from(TABLA).select('id, nombre, emails, cuit, activo')
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const porCuit = new Map<string, any>()
    const porEmail = new Map<string, any>()
    for (const c of actuales || []) {
      if (c.cuit) porCuit.set(c.cuit, c)
      for (const e of c.emails || []) porEmail.set(e, c)
    }

    const tocados = new Set<string>()
    const actualizar = new Map<string, Fila>()
    const nuevos = new Map<string, Fila>()
    for (const f of filas) {
      const existente = (f.cuit && porCuit.get(f.cuit)) || f.emails.map(e => porEmail.get(e)).find(Boolean)
      if (existente) {
        const prev = actualizar.get(existente.id)
        actualizar.set(existente.id, prev ? {
          nombre: prev.nombre || f.nombre,
          emails: Array.from(new Set([...prev.emails, ...f.emails])),
          cuit: prev.cuit || f.cuit,
        } : f)
        tocados.add(existente.id)
      } else {
        const clave = f.cuit || f.emails[0]
        const prev = nuevos.get(clave)
        nuevos.set(clave, prev ? { nombre: prev.nombre || f.nombre, emails: Array.from(new Set([...prev.emails, ...f.emails])), cuit: prev.cuit || f.cuit } : f)
      }
    }

    const ahora = new Date().toISOString()
    for (const [id, f] of Array.from(actualizar.entries())) {
      const c = (actuales || []).find(x => x.id === id)!
      const { error: e } = await db.from(TABLA).update({
        nombre: f.nombre || c.nombre,
        emails: f.emails.length ? f.emails : c.emails,
        cuit: f.cuit || c.cuit,
        activo: true,
        updated_at: ahora,
      }).eq('id', id)
      if (e) return NextResponse.json({ ok: false, error: `${f.nombre || f.cuit || f.emails[0]}: ${e.message}` }, { status: 500 })
    }

    const listaNuevos = Array.from(nuevos.values())
    for (let i = 0; i < listaNuevos.length; i += 200) {
      const { error: e } = await db.from(TABLA).insert(listaNuevos.slice(i, i + 200).map(f => ({ ...f, activo: true })))
      if (e) return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
    }

    let desactivados = 0
    if (body.desactivarFaltantes === true) {
      const ids = (actuales || []).filter(c => c.activo && !tocados.has(c.id)).map(c => c.id)
      for (let i = 0; i < ids.length; i += 200) {
        const { error: e } = await db.from(TABLA).update({ activo: false, updated_at: ahora }).in('id', ids.slice(i, i + 200))
        if (e) return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
      }
      desactivados = ids.length
    }

    return NextResponse.json({ ok: true, nuevos: listaNuevos.length, actualizados: actualizar.size, desactivados })
  }

  // ── Alta / edición manual ──
  const cambios: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('nombre' in body) cambios.nombre = typeof body.nombre === 'string' && body.nombre.trim() ? body.nombre.trim().slice(0, 150) : null
  if ('emails' in body) cambios.emails = extraerEmails(Array.isArray(body.emails) ? body.emails.join(';') : body.emails)
  if ('cuit' in body) {
    if (body.cuit === null || body.cuit === '') cambios.cuit = null
    else {
      const c = normalizarCuit(body.cuit)
      if (!c) return NextResponse.json({ ok: false, error: 'El CUIT tiene que tener 11 números' }, { status: 400 })
      cambios.cuit = c
    }
  }
  if ('activo' in body) {
    if (typeof body.activo !== 'boolean') return NextResponse.json({ ok: false, error: 'Dato inválido' }, { status: 400 })
    cambios.activo = body.activo
  }

  if (body.id) {
    if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) return NextResponse.json({ ok: false, error: 'Id inválido' }, { status: 400 })
    const { data, error } = await db.from(TABLA).update(cambios).eq('id', body.id).select().single()
    if (error) return NextResponse.json({ ok: false, error: error.code === '23505' ? 'Ese CUIT ya está cargado en otro distribuidor' : error.message }, { status: 400 })
    if (!(data.emails?.length || data.cuit)) return NextResponse.json({ ok: false, error: 'Tiene que quedar al menos un mail o el CUIT' }, { status: 400 })
    return NextResponse.json({ ok: true, data })
  }

  if (!((cambios.emails as string[] | undefined)?.length || cambios.cuit)) {
    return NextResponse.json({ ok: false, error: 'Cargá al menos un mail o el CUIT' }, { status: 400 })
  }
  const { data, error } = await db.from(TABLA).insert({ activo: true, ...cambios }).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.code === '23505' ? 'Ese CUIT ya está cargado' : error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

/** Borra un distribuidor. Su historial de accesos y pedidos queda con el nombre. */
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
