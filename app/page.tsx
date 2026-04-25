import { supabase, Producto } from '@/lib/supabase'
import LandingClient from '@/components/LandingClient'

export const revalidate = 300 // revalidate every 5 min

export default async function Home() {
  const { data, error } = await supabase
    .from('productos_oportunidades')
    .select('*')
    .eq('activo', true)
    .order('es_urgente', { ascending: false })
    .order('fecha_venc', { ascending: true })

  const productos: Producto[] = data || []

  return <LandingClient productos={productos} />
}
