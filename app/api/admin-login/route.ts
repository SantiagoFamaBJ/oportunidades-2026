import { NextResponse } from 'next/server'
import { createToken, COOKIE_NAME, sessionCookieOptions } from '@/lib/adminSession'

const PASSWORD = process.env.DM_ADMIN_PASSWORD

export async function POST(req: Request) {
  // Si no hay contraseña configurada, no dejamos entrar
  if (!PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  let password: string
  try {
    const body = await req.json()
    password = typeof body.password === 'string' ? body.password.trim() : ''
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!password || password !== PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  // Contraseña correcta: crear token firmado y setearlo en cookie httpOnly
  const token = createToken()
  const response = NextResponse.json({ ok: true }, { status: 200 })
  response.cookies.set(COOKIE_NAME, token, sessionCookieOptions())
  return response
}
