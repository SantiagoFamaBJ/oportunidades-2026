import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { interpretarIdentificador } from '@/lib/clientes'
import { CLIENTE_COOKIE, crearTokenCliente, opcionesCookieCliente, registrarAcceso } from '@/lib/clienteSession'

const NO_ENCONTRADO = 'Ese CUIT no está habilitado. Consultá con tu vendedor.'

export async function POST(req: Request) {
  let raw = ''
  try { raw = String((await req.json()).identificador || '').slice(0, 200) } catch {}
  // Solo CUIT: se acepta con o sin guiones, espacios o puntos
  const ident = interpretarIdentificador(raw)
  if (!ident || ident.tipo !== 'cuit') {
    return NextResponse.json({ ok: false, error: 'Escribí tu CUIT: son 11 números, con o sin guiones.' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data } = await db.from('clientes_oportunidades').select('id, nombre, activo, emails, cuit').eq('cuit', ident.valor).limit(1)
  const cliente = data?.[0]

  if (!cliente || !cliente.activo) {
    await registrarAcceso('rechazado', cliente ? { id: cliente.id, nombre: cliente.nombre } : null, ident.valor)
    // Pequeña espera para que no convenga probar CUITs al azar
    await new Promise(r => setTimeout(r, 700))
    return NextResponse.json({ ok: false, error: NO_ENCONTRADO }, { status: 401 })
  }

  const nombre = cliente.nombre || cliente.emails?.[0] || cliente.cuit || 'Distribuidor'
  await registrarAcceso('login', { id: cliente.id, nombre }, ident.valor)

  const res = NextResponse.json({ ok: true, nombre })
  res.cookies.set(CLIENTE_COOKIE, crearTokenCliente(cliente.id), opcionesCookieCliente())
  return res
}
