import { Producto } from '@/lib/supabase'

/** true si hay que mostrar precio tachado + % de descuento. */
export function tieneDescuento(p: Producto): boolean {
  if (p.consultar_precio) return false
  if (!p.precio_publico || p.precio_publico <= p.precio_outlet) return false
  if (p.descuento_pct === 0) return false
  return true
}

export function pctDescuento(p: Producto): number {
  if (!tieneDescuento(p)) return 0
  return Math.round((1 - p.precio_outlet / p.precio_publico) * 100)
}
