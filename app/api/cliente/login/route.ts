import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { interpretarIdentificador } from '@/lib/clientes'
import { CLIENTE_COOKIE, crearTokenCliente, opcionesCookieCliente, registrarAcceso } from '@/lib/clienteSession'

const NO_ENCONTRADO = 'No encontramos ese mail o CUIT en la lista de distribuidores. Consultá con tu vendedor.'

export async function POST(req: Request) {
  let raw = ''
  try { raw = String((await req.json()).identificador || '').slice(0, 200) } catch {}
  const ident = interpretarIdentificador(raw)
  if (!ident) {
    return NextResponse.json({ ok: false, error: 'Escribí tu mail o tu CUIT (11 números).' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const q = db.from('clientes_oportunidades').select('id, nombre, activo, emails, cuit').limit(1)
  const { data } = ident.tipo === 'email'
    ? await q.contains('emails', [ident.valor])
    : await q.eq('cuit', ident.valor)
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
