import { supabase, Producto } from '@/lib/supabase'
import LandingClient from '@/components/LandingClient'

export const revalidate = 300

export default async function Home() {
  const { data } = await supabase
    .from('productos_oportunidades')
    .select('*')
    .eq('activo', true)
    .order('es_urgente', { ascending: false })
    .order('fecha_venc', { ascending: true })

  return <LandingClient productos={(data || []) as Producto[]} />
}
