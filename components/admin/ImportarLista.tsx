'use client'
import { useRef, useState } from 'react'
import { Producto } from '@/lib/supabase'
import { leerPlanilla, armarPlan, aplicarPlan, PlanImportacion, FilaWeb } from '@/lib/importar'

const fmt = (n: number) => '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }

export default function ImportarLista({ productos, onDone }: { productos: Producto[]; onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [plan, setPlan] = useState<PlanImportacion | null>(null)
  const [archivo, setArchivo] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [ver, setVer] = useState<'nuevos' | 'actualizados' | 'ocultar'>('nuevos')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErr(''); setMsg(''); setPlan(null); setArchivo(f.name)
    try {
      const rows = await leerPlanilla(f)
      const p = armarPlan(rows, productos)
      if (p.filas.length === 0) throw new Error('La hoja "Web" está vacía. Abrí la planilla en Excel, revisá que tenga datos y guardala antes de subirla.')
      setPlan(p)
    } catch (e: any) { setErr(e.message || String(e)) }
  }

  async function aplicar() {
    if (!plan) return
    setBusy(true); setErr('')
    try {
      await aplicarPlan(plan, setMsg)
      setMsg(`✅ Listo: ${plan.filas.length} productos publicados, ${plan.aOcultar.length} ocultados.`)
      setPlan(null)
      onDone()
    } catch (e: any) { setErr('Error al guardar: ' + (e.message || e)) }
    setBusy(false)
  }

  const lista: (FilaWeb | Producto)[] = !plan ? [] : ver === 'nuevos' ? plan.nuevos : ver === 'actualizados' ? plan.actualizados : plan.aOcultar

  return (
    <div style={{ padding: '20px 28px', maxWidth: 1100 }}>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Actualizar la lista del mes</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 14 }}>
          Subí la planilla de oportunidades (.xlsx). Se lee la hoja <b>Web</b>, que ya viene sin las filas quitadas.
          Antes de aplicar vas a ver qué entra, qué se actualiza y qué se oculta. Nombre, categoría y promo que cargaste a mano se mantienen por código.
        </div>
        <input ref={ref} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={onFile} />
        <button onClick={() => ref.current?.click()} disabled={busy} style={btn}>📄 Elegir planilla</button>
        {archivo && <span style={{ marginLeft: 12, fontSize: 12, color: '#888' }}>{archivo}</span>}
        {err && <div style={{ ...note, background: '#fdecea', color: '#c62828' }}>{err}</div>}
        {msg && <div style={{ ...note, background: '#f0f7f0', color: '#2e7d32' }}>{msg}</div>}
      </div>

      {plan && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {([['nuevos', `🆕 Entran ${plan.nuevos.length}`], ['actualizados', `🔄 Se actualizan ${plan.actualizados.length}`], ['ocultar', `🚫 Se ocultan ${plan.aOcultar.length}`]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setVer(k)} style={{ ...chip, ...(ver === k ? chipOn : {}) }}>{l}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888', alignSelf: 'center' }}>
              {plan.filas.filter(f => f.consultar_precio).length} con “Consultar precio”
            </span>
          </div>
          {plan.avisos.map((a, i) => <div key={i} style={{ ...note, background: '#fff8e1', color: '#8a6d00', marginTop: 0, marginBottom: 8 }}>⚠️ {a}</div>)}
          <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f7f7f5', position: 'sticky', top: 0 }}>
                {['Código', 'Nombre', 'Lote', 'Vence', 'Stock', 'Outlet', 'Público'].map(h => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {lista.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#bbb', padding: 24 }}>Nada para mostrar</td></tr>}
                {lista.map(p => (
                  <tr key={p.id} style={{ borderTop: '1px solid #f0f0ee' }}>
                    <td style={td}><code>{p.codigo}</code></td>
                    <td style={td}>{p.nombre}</td>
                    <td style={td}>{p.lote}</td>
                    <td style={td}>{fmtDate(p.fecha_venc)}</td>
                    <td style={td}>{p.stock}</td>
                    <td style={td}>{p.consultar_precio ? 'Consultar' : fmt(p.precio_outlet)}</td>
                    <td style={td}>{p.precio_publico ? fmt(p.precio_publico) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            <button onClick={() => setPlan(null)} disabled={busy} style={{ ...btn, background: 'transparent', color: '#888', border: '1.5px solid #e4e4e2' }}>Cancelar</button>
            <button onClick={aplicar} disabled={busy} style={btn}>{busy ? 'Aplicando…' : 'Aplicar cambios'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
const btn: React.CSSProperties = { padding: '9px 18px', background: '#f15922', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const note: React.CSSProperties = { marginTop: 12, padding: '8px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600 }
const chip: React.CSSProperties = { padding: '6px 12px', border: '1.5px solid #e4e4e2', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#f0f0ee', color: '#888' }
const chipOn: React.CSSProperties = { background: '#f15922', color: '#fff', borderColor: '#f15922' }
const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888' }
const td: React.CSSProperties = { padding: '7px 10px', verticalAlign: 'top' }
