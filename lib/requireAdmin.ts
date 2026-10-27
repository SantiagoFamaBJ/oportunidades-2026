import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, COOKIE_NAME } from '@/lib/adminSession'

/** Devuelve una respuesta 401 si no hay sesión de admin válida; null si está todo bien. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!verifyToken(token)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  return null
}
