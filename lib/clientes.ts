// Utilidades compartidas (navegador y servidor) para identificar distribuidores.

/** Deja solo los 11 dígitos de un CUIT. Acepta "20-12345678-9", "20123456789" o un número de Excel. */
export function normalizarCuit(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const d = String(v).replace(/\D/g, '')
  return d.length === 11 ? d : null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Un mail en minúsculas, o null si no parece un mail. */
export function normalizarEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const e = v.trim().toLowerCase()
  return EMAIL_RE.test(e) && e.length <= 200 ? e : null
}

/** Una celda puede traer varios mails separados por ; , / espacio o salto de línea. */
export function extraerEmails(v: unknown): string[] {
  if (v === null || v === undefined) return []
  return Array.from(new Set(String(v).split(/[;,/\s]+/).map(normalizarEmail).filter(Boolean) as string[]))
}

/** Lo que escribe el distribuidor al entrar: decide si es mail o CUIT. */
export function interpretarIdentificador(v: unknown): { tipo: 'email'; valor: string } | { tipo: 'cuit'; valor: string } | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (t.includes('@')) {
    const e = normalizarEmail(t)
    return e ? { tipo: 'email', valor: e } : null
  }
  const c = normalizarCuit(t)
  return c ? { tipo: 'cuit', valor: c } : null
}

export function fmtCuit(c: string | null | undefined): string {
  if (!c || c.length !== 11) return c || ''
  return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`
}
