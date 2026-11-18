import { NextResponse } from 'next/server'
import { CLIENTE_COOKIE, opcionesCookieCliente } from '@/lib/clienteSession'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(CLIENTE_COOKIE, '', { ...opcionesCookieCliente(), maxAge: 0 })
  return res
}
