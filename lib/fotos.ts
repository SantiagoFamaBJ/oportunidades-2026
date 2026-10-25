import { supabase } from '@/lib/supabase'

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

/** Sube la foto a la biblioteca y la asigna al código (reemplaza la anterior). */
export async function subirFoto(codigo: string, file: File): Promise<{ url?: string; error?: string }> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${codigo}.${ext}`
  const up = await supabase.storage.from(FOTOS_BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined })
  if (up.error) return { error: up.error.message }
  const { data } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path)
  const url = `${data.publicUrl}?t=${Date.now()}`
  const { error } = await supabase.from('fotos_productos')
    .upsert({ codigo, imagen_url: url, updated_at: new Date().toISOString() }, { onConflict: 'codigo' })
  if (error) return { error: error.message }
  return { url }
}

export async function borrarFoto(codigo: string, url: string): Promise<string | null> {
  const path = decodeURIComponent(url.split(`/${FOTOS_BUCKET}/`)[1]?.split('?')[0] || '')
  if (path) await supabase.storage.from(FOTOS_BUCKET).remove([path])
  const { error } = await supabase.from('fotos_productos').delete().eq('codigo', codigo)
  return error ? error.message : null
}
