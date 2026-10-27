// Helper del lado del navegador para llamar a las rutas /api/admin/*.
// La cookie de sesión (httpOnly) viaja sola; el navegador nunca ve la contraseña ni la clave service role.

export type AdminResult<T = any> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string }

async function parse<T>(res: Response): Promise<AdminResult<T>> {
  const json = await res.json().catch(() => ({}))
  if (res.ok) return { ok: true, status: res.status, data: json as T }
  const error = res.status === 401 ? 'La sesión venció. Volvé a ingresar.' : (json.error || `Error ${res.status}`)
  return { ok: false, status: res.status, error }
}

export async function adminPost<T = any>(url: string, body: unknown): Promise<AdminResult<T>> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return parse<T>(res)
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Sin conexión' }
  }
}

export async function adminForm<T = any>(url: string, form: FormData): Promise<AdminResult<T>> {
  try {
    const res = await fetch(url, { method: 'POST', body: form })
    return parse<T>(res)
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || 'Sin conexión' }
  }
}
