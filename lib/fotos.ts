import { supabase } from '@/lib/supabase'
import { adminForm } from '@/lib/adminApi'

export const FOTOS_BUCKET = 'oportunidades-fotos'

/** Mapa codigo -> url de la foto (biblioteca de fotos por código). */
export async function cargarFotos(): Promise<Record<string, string>> {
  const { data } = await supabase.from('fotos_productos').select('codigo, imagen_url')
  const map: Record<string, string> = {}
  for (const f of data || []) map[f.codigo] = f.imagen_url
  return map
}

/** Saca el código del nombre del archivo. Ej: "021220-A2000.jpg" o "021220-A2000 (1).png" -> "021220-A2000". */
export function codigoDesdeArchivo(nombre: string): string | null {
  const stem = nombre.replace(/\.[^.]+$/, '').trim().toUpperCase()
  const m = stem.match(/^\d{6}-[A-Z0-9]{5}/)
  return m ? m[0] : null
}

/** Sube la foto a la biblioteca y la asigna al código (reemplaza la anterior). Pasa por el servidor. */
export async function subirFoto(codigo: string, file: File): Promise<{ url?: string; error?: string }> {
  const form = new FormData()
  form.append('codigo', codigo)
  form.append('file', file)
  const r = await adminForm<{ url: string }>('/api/admin/fotos', form)
  return r.ok ? { url: r.data.url } : { error: r.error }
}

export async function borrarFoto(codigo: string, _url?: string): Promise<string | null> {
  try {
    const res = await fetch('/api/admin/fotos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) })
    if (res.ok) return null
    const j = await res.json().catch(() => ({}))
    return res.status === 401 ? 'La sesión venció. Volvé a ingresar.' : (j.error || `Error ${res.status}`)
  } catch (e: any) { return e?.message || 'Sin conexión' }
}
