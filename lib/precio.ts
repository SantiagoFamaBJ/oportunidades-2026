import { Producto } from '@/lib/supabase'

/** Promo cargada a mano (1+1, 2+1, …). Si hay promo, reemplaza al precio. */
export function promoDe(p: Producto): string | null {
  const v = (p.promo || '').trim()
  return v || null
}

/** Productos que no muestran precio: con promo o "Consultar precio". No suman al total. */
export function sinPrecio(p: Producto): boolean {
  return !!promoDe(p) || !!p.consultar_precio
}

/** Bajada de la promo. "2+1" -> "Comprás 2 y te llevás 1 más sin cargo". */
export function detallePromo(promo: string): string {
  const m = promo.replace(/\s/g, '').match(/^(\d+)\+(\d+)$/)
  if (!m) return `Promo ${promo}`
  const [, a, b] = m
  return `Comprás ${a} y te llevás ${b} más sin cargo`
}

/** true si hay que mostrar precio tachado + % de descuento. */
export function tieneDescuento(p: Producto): boolean {
  if (sinPrecio(p)) return false
  if (!p.precio_publico || p.precio_publico <= p.precio_outlet) return false
  if (p.descuento_pct === 0) return false
  return true
}

export function pctDescuento(p: Producto): number {
  if (!tieneDescuento(p)) return 0
  return Math.round((1 - p.precio_outlet / p.precio_publico) * 100)
}
