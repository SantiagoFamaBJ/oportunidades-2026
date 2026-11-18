import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAdmin'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** Todos los productos (visibles y ocultos) para el admin. */
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  const { data, error } = await supabaseAdmin().from('productos_oportunidades').select('*')
    .order('es_urgente', { ascending: false }).order('fecha_venc', { ascending: true })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
