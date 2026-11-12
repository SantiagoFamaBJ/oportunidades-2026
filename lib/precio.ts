import { Producto } from '@/lib/supabase'

/** Promo cargada a mano (1+1, 2+1, …). Si hay promo, reemplaza al precio. */
export function promoDe(p: Producto): string | null {
  const v = (p.promo || '').trim()
  return v || null
}

/**
 * Precio que se cobra por unidad:
 * - con promo: el precio público (lista), sin descuento del mes
 * - "Consultar precio": null
 * - resto: el precio outlet
 */
export function precioFinal(p: Producto): number | null {
  if (promoDe(p)) return p.precio_publico > 0 ? p.precio_publico : null
  if (p.consultar_precio) return null
  return p.precio_outlet
}

/** Sin precio para mostrar ni sumar al total. */
export function sinPrecio(p: Producto): boolean {
  return precioFinal(p) === null
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
  if (promoDe(p) || sinPrecio(p)) return false
  if (!p.precio_publico || p.precio_publico <= p.precio_outlet) return false
  if (p.descuento_pct === 0) return false
  return true
}

export function pctDescuento(p: Producto): number {
  if (!tieneDescuento(p)) return 0
  return Math.round((1 - p.precio_outlet / p.precio_publico) * 100)
}
