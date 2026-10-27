import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'oportunidades-fotos'
const CODIGO_RE = /^\d{6}-[A-Z0-9]{5}$/
const EXT_OK = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']
const MAX_BYTES = 8 * 1024 * 1024

/** Sube (o reemplaza) la foto de un código y la registra en la biblioteca. */
export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ ok: false, error: 'Formulario inválido' }, { status: 400 })
  }
  const codigo = String(form.get('codigo') || '').trim().toUpperCase()
  const file = form.get('file')
  if (!CODIGO_RE.test(codigo)) return NextResponse.json({ ok: false, error: 'Código inválido' }, { status: 400 })
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'Falta el archivo' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ ok: false, error: 'El archivo no es una imagen' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: 'La imagen pesa más de 8 MB' }, { status: 400 })

  let ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  if (!EXT_OK.includes(ext)) ext = 'jpg'
  const path = `${codigo}.${ext}`

  const db = supabaseAdmin()
  const up = await db.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { upsert: true, contentType: file.type })
  if (up.error) return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 })

  const { data } = db.storage.from(BUCKET).getPublicUrl(path)
  const url = `${data.publicUrl}?t=${Date.now()}`
  const { error } = await db.from('fotos_productos')
    .upsert({ codigo, imagen_url: url, updated_at: new Date().toISOString() }, { onConflict: 'codigo' })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, url })
}

/** Borra la foto de un código. */
export async function DELETE(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  let codigo = ''
  try { codigo = String((await req.json()).codigo || '').trim().toUpperCase() } catch {}
  if (!CODIGO_RE.test(codigo)) return NextResponse.json({ ok: false, error: 'Código inválido' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: row } = await db.from('fotos_productos').select('imagen_url').eq('codigo', codigo).maybeSingle()
  const path = row?.imagen_url ? decodeURIComponent(row.imagen_url.split(`/${BUCKET}/`)[1]?.split('?')[0] || '') : ''
  if (path) await db.storage.from(BUCKET).remove([path])

  const { error } = await db.from('fotos_productos').delete().eq('codigo', codigo)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
