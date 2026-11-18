import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** Últimos ingresos a la web (incluye intentos rechazados). */
export async function GET(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  const limite = Math.min(Math.max(Number(new URL(req.url).searchParams.get('limite')) || 500, 1), 2000)
  const { data, error } = await supabaseAdmin().from('accesos_oportunidades')
    .select('id, created_at, cliente_id, cliente_nombre, identificador, tipo, ip')
    .order('created_at', { ascending: false }).limit(limite)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
