import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(url, anon)
export const supabaseAdmin = () => createClient(url, service)

export type Producto = {
  id: string
  nombre: string
  lote: string
  fecha_venc: string
  stock: number
  precio_publico: number
  precio_outlet: number
  es_urgente: boolean
  imagen_url: string | null
  activo: boolean
}
