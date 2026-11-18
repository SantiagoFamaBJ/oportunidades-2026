import readXlsxFile from 'read-excel-file'
import { extraerEmails, normalizarCuit } from '@/lib/clientes'

export type FilaCliente = { nombre: string | null; emails: string[]; cuit: string | null }
export type LecturaClientes = { filas: FilaCliente[]; invalidas: number; columnas: string }

const RE_MAIL = /mail|correo/i
const RE_CUIT = /cuit|cuil/i
const RE_NOMBRE = /raz[oó]n|nombre|cliente|denominaci|empresa|distribuidor/i

function leerCsv(texto: string): unknown[][] {
  const sep = (texto.split('\n')[0].match(/;/g) || []).length > (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ','
  return texto.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(sep).map(c => c.replace(/^"|"$/g, '').trim()))
}

/** Lee el Excel (o CSV) de distribuidores. Reconoce las columnas por su título (Mail, CUIT, Razón social…). */
export async function leerClientes(file: File): Promise<LecturaClientes> {
  const rows: unknown[][] = file.name.toLowerCase().endsWith('.csv')
    ? leerCsv(await file.text())
    : (await readXlsxFile(file)) as unknown[][]

  // Fila de títulos: la primera (de las 10 primeras) que tenga Mail o CUIT
  let h = rows.slice(0, 10).findIndex(r => r.some(c => typeof c === 'string' && (RE_MAIL.test(c) || RE_CUIT.test(c))))
  let colsMail: number[] = [], colCuit = -1, colNombre = -1
  if (h >= 0) {
    rows[h].forEach((c, i) => {
      const t = String(c ?? '')
      if (RE_MAIL.test(t)) colsMail.push(i)
      else if (RE_CUIT.test(t) && colCuit < 0) colCuit = i
      else if (RE_NOMBRE.test(t) && colNombre < 0) colNombre = i
    })
  } else {
    // Sin títulos: adivina por el contenido de las primeras filas
    h = -1
    const muestra = rows.slice(0, 20)
    const ancho = Math.max(0, ...muestra.map(r => r.length))
    for (let i = 0; i < ancho; i++) {
      const vals = muestra.map(r => r[i])
      if (vals.some(v => typeof v === 'string' && v.includes('@'))) colsMail.push(i)
      else if (colCuit < 0 && vals.filter(v => normalizarCuit(v)).length >= Math.ceil(muestra.length / 2)) colCuit = i
      else if (colNombre < 0 && vals.some(v => typeof v === 'string' && /[a-z]{3}/i.test(v))) colNombre = i
    }
  }
  if (colCuit < 0) throw new Error('No encontré la columna CUIT. Poné los títulos "Razón social" y "CUIT" en la primera fila.')
  colsMail = [] // el ingreso es solo con CUIT

  const filas: FilaCliente[] = []
  let invalidas = 0
  for (const r of rows.slice(h + 1)) {
    if (!r.some(c => c !== null && String(c).trim() !== '')) continue
    const emails = Array.from(new Set(colsMail.flatMap(i => extraerEmails(r[i]))))
    const cuit = colCuit >= 0 ? normalizarCuit(r[colCuit]) : null
    if (!cuit) { invalidas++; continue }
    const n = colNombre >= 0 ? String(r[colNombre] ?? '').trim() : ''
    filas.push({ nombre: n || null, emails, cuit })
  }

  const titulos = h >= 0 ? rows[h] : []
  const nombreCol = (i: number) => String(titulos[i] ?? `columna ${i + 1}`)
  const columnas = [
    colNombre >= 0 ? `Nombre: ${nombreCol(colNombre)}` : null,
    colsMail.length ? `Mail: ${colsMail.map(nombreCol).join(', ')}` : null,
    colCuit >= 0 ? `CUIT: ${nombreCol(colCuit)}` : null,
  ].filter(Boolean).join(' · ')

  return { filas, invalidas, columnas }
}
