import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken, COOKIE_NAME as ADMIN_COOKIE } from '@/lib/adminSession'

export const CLIENTE_COOKIE = 'dm_cliente_session'
const SESSION_MS = 30 * 24 * 60 * 60 * 1000 // 30 días
const VISITA_CADA_MS = 30 * 60 * 1000 // una "visita" nueva en el registro cada 30 min como mínimo

function firmar(payload: string): string {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s) throw new Error('ADMIN_SESSION_SECRET no configurada')
  // Prefijo distinto al del admin: un token de distribuidor nunca sirve como token de admin
  return createHmac('sha256', s).update('cliente:' + payload).digest('base64url')
}

export function crearTokenCliente(clienteId: string): string {
  const payload = Buffer.from(JSON.stringify({ id: clienteId, ts: Date.now() })).toString('base64url')
  return `${payload}.${firmar(payload)}`
}

function leerTokenCliente(token: string | undefined): string | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const payload = token.slice(0, dot)
  try {
    const a = Buffer.from(token.slice(dot + 1), 'base64url')
    const b = Buffer.from(firmar(payload), 'base64url')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof data.id !== 'string' || typeof data.ts !== 'number' || Date.now() - data.ts > SESSION_MS) return null
    return data.id
  } catch { return null }
}

export function opcionesCookieCliente() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: SESSION_MS / 1000 }
}

export type ClienteSesion = { id: string | null; nombre: string; ident: string; esAdmin: boolean; ultimo_acceso?: string | null }

/** Quién está mirando la web: un distribuidor habilitado o el admin. null si nadie. */
export async function clienteActual(): Promise<ClienteSesion | null> {
  const jar = await cookies()
  const id = leerTokenCliente(jar.get(CLIENTE_COOKIE)?.value)
  if (id) {
    const { data } = await supabaseAdmin().from('clientes_oportunidades')
      .select('id, nombre, emails, cuit, activo, ultimo_acceso').eq('id', id).maybeSingle()
    // Si lo desactivaste o lo sacaste de la lista, pierde el acceso aunque tenga la cookie
    if (data?.activo) {
      return { id: data.id, nombre: data.nombre || data.emails?.[0] || data.cuit || 'Distribuidor', ident: data.emails?.[0] || data.cuit || '', esAdmin: false, ultimo_acceso: data.ultimo_acceso }
    }
  }
  // El admin logueado también puede ver la web
  if (verifyToken(jar.get(ADMIN_COOKIE)?.value)) return { id: null, nombre: 'Admin', ident: 'admin', esAdmin: true }
  return null
}

/** Interruptor del admin: si está apagado, la web sigue abierta para todos. */
export async function accesoRestringido(): Promise<boolean> {
  const { data } = await supabaseAdmin().from('oportunidades_config').select('acceso_restringido').eq('id', 1).maybeSingle()
  return data?.acceso_restringido === true
}

const ANONIMO: ClienteSesion = { id: null, nombre: '', ident: '', esAdmin: false }

export async function requireCliente(): Promise<{ cliente: ClienteSesion } | { denied: NextResponse }> {
  const [cliente, restringido] = await Promise.all([clienteActual(), accesoRestringido()])
  if (cliente) return { cliente }
  if (!restringido) return { cliente: ANONIMO }
  return { denied: NextResponse.json({ ok: false, error: 'Necesitás ingresar' }, { status: 401 }) }
}

async function datosRequest() {
  const h = await headers()
  return {
    ip: (h.get('x-forwarded-for') || '').split(',')[0].trim().slice(0, 64) || null,
    user_agent: (h.get('user-agent') || '').slice(0, 300) || null,
  }
}

/** Guarda una línea en el registro de accesos. Nunca hace fallar el pedido del usuario. */
export async function registrarAcceso(tipo: 'login' | 'visita' | 'rechazado', cliente: { id: string | null; nombre: string | null } | null, identificador: string | null) {
  try {
    const db = supabaseAdmin()
    await db.from('accesos_oportunidades').insert({
      tipo,
      cliente_id: cliente?.id ?? null,
      cliente_nombre: cliente?.nombre ?? null,
      identificador: identificador?.slice(0, 200) ?? null,
      ...(await datosRequest()),
    })
    if (cliente?.id && tipo !== 'rechazado') {
      const { data } = await db.from('clientes_oportunidades').select('accesos').eq('id', cliente.id).maybeSingle()
      await db.from('clientes_oportunidades')
        .update({ ultimo_acceso: new Date().toISOString(), accesos: (data?.accesos ?? 0) + 1 })
        .eq('id', cliente.id)
    }
  } catch {}
}

/** Registra una visita si pasó un rato desde el último acceso de este distribuidor. */
export async function registrarVisitaSiCorresponde(c: ClienteSesion) {
  if (c.esAdmin || !c.id) return // admin y visitantes sin ingreso (acceso abierto) no se registran
  const ultimo = c.ultimo_acceso ? new Date(c.ultimo_acceso).getTime() : 0
  if (Date.now() - ultimo < VISITA_CADA_MS) return
  await registrarAcceso('visita', { id: c.id, nombre: c.nombre }, c.ident)
}
