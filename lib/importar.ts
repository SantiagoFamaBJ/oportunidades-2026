import readXlsxFile from 'read-excel-file'
import { supabase, Producto } from '@/lib/supabase'

/** Columnas de la hoja "Web" de la planilla de oportunidades. */
const COLS = ['codigo', 'nombre', 'lote', 'fecha_venc', 'stock', 'precio_lista1', 'precio_outlet', 'precio_publico', 'descuento_pct', 'consultar_precio'] as const

export type FilaWeb = {
  id: string
  codigo: string
  nombre: string
  lote: string
  fecha_venc: string
  stock: number
  precio_publico: number
  precio_outlet: number
  descuento_pct: number | null
  consultar_precio: boolean
  es_urgente: boolean
  categoria: string | null
  promo: string | null
  activo: true
}

export type PlanImportacion = {
  filas: FilaWeb[]
  nuevos: FilaWeb[]
  actualizados: FilaWeb[]
  aOcultar: Producto[]
  avisos: string[]
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function fecha(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10)
  if (typeof v === 'string') {
    const t = v.trim()
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
    m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return null
}

/** Saca los "+++" y "ppr-xx" que trae el nombre de Itris. */
const limpiarNombre = (n: string) => n.replace(/\+/g, ' ').replace(/\bppr-?\d+\b/gi, ' ').replace(/\s+/g, ' ').trim()

export async function leerPlanilla(file: File): Promise<unknown[][]> {
  try {
    return await readXlsxFile(file, { sheet: 'Web' }) as unknown[][]
  } catch (e: any) {
    throw new Error('No encontré la hoja "Web" en el archivo. Subí la planilla de oportunidades (.xlsx) guardada desde Excel.')
  }
}

export function armarPlan(rows: unknown[][], existentes: Producto[]): PlanImportacion {
  const avisos: string[] = []
  const head = (rows[0] || []).map(h => String(h ?? '').trim())
  const idx = Object.fromEntries(COLS.map(c => [c, head.indexOf(c)])) as Record<typeof COLS[number], number>
  const faltan = COLS.filter(c => idx[c] < 0)
  if (faltan.length) throw new Error(`A la hoja "Web" le faltan columnas: ${faltan.join(', ')}`)

  // Lo que se cargó a mano (nombre, categoría, promo) se hereda por código.
  const porCodigo = new Map<string, Producto>()
  for (const p of existentes) {
    const prev = porCodigo.get(p.codigo)
    if (!prev || (p.activo && !prev.activo)) porCodigo.set(p.codigo, p)
  }
  const porId = new Map(existentes.map(p => [p.id, p]))

  const filas = new Map<string, FilaWeb>()
  let sinPublico = 0
  for (const r of rows.slice(1)) {
    const codigo = String(r[idx.codigo] ?? '').trim()
    if (!codigo) continue
    const lote = String(r[idx.lote] ?? '').trim()
    const fv = fecha(r[idx.fecha_venc])
    if (!fv) { avisos.push(`${codigo} lote ${lote}: fecha de vencimiento inválida, no se cargó`); continue }
    const outlet = num(r[idx.precio_outlet])
    const publico = num(r[idx.precio_publico])
    const desc = num(r[idx.descuento_pct])
    const consultar = String(r[idx.consultar_precio] ?? '').toUpperCase() === 'SI' || outlet === null
    if (publico === null) sinPublico++
    const id = lote ? `${codigo}_${lote}` : codigo
    const stock = Math.round(num(r[idx.stock]) ?? 0)
    const dup = filas.get(id)
    if (dup) { dup.stock += stock; continue }
    const base = porCodigo.get(codigo)
    filas.set(id, {
      id, codigo, lote, fecha_venc: fv, stock,
      nombre: base?.nombre || limpiarNombre(String(r[idx.nombre] ?? codigo)),
      precio_outlet: consultar ? 0 : outlet!,
      precio_publico: publico ?? 0,
      descuento_pct: consultar ? null : (desc === null ? null : Math.round(desc)),
      consultar_precio: consultar,
      es_urgente: consultar || (desc !== null && desc >= 80),
      categoria: base?.categoria ?? null,
      promo: base?.promo ?? null,
      activo: true,
    })
  }
  if (sinPublico) avisos.push(`${sinPublico} producto(s) sin precio público: se muestran con un solo precio`)

  const lista = Array.from(filas.values())
  const ids = new Set(lista.map(f => f.id))
  return {
    filas: lista,
    nuevos: lista.filter(f => !porId.has(f.id)),
    actualizados: lista.filter(f => porId.has(f.id)),
    aOcultar: existentes.filter(p => p.activo && !ids.has(p.id)),
    avisos,
  }
}

export async function aplicarPlan(plan: PlanImportacion, onProgreso?: (msg: string) => void): Promise<void> {
  for (let i = 0; i < plan.filas.length; i += 100) {
    onProgreso?.(`Guardando productos ${i + 1}–${Math.min(i + 100, plan.filas.length)} de ${plan.filas.length}…`)
    const { error } = await supabase.from('productos_oportunidades').upsert(plan.filas.slice(i, i + 100), { onConflict: 'id' })
    if (error) throw new Error(error.message)
  }
  const ocultar = plan.aOcultar.map(p => p.id)
  for (let i = 0; i < ocultar.length; i += 100) {
    onProgreso?.('Ocultando los que ya no están en la lista…')
    const { error } = await supabase.from('productos_oportunidades').update({ activo: false }).in('id', ocultar.slice(i, i + 100))
    if (error) throw new Error(error.message)
  }
}
