'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { adminPost } from '@/lib/adminApi'
import { fmtCuit } from '@/lib/clientes'
import { leerClientes, LecturaClientes } from '@/lib/importarClientes'

type Cliente = { id: string; nombre: string | null; emails: string[]; cuit: string | null; activo: boolean; accesos: number; ultimo_acceso: string | null }
type Acceso = { id: number; created_at: string; cliente_id: string | null; cliente_nombre: string | null; identificador: string | null; tipo: 'login' | 'visita' | 'rechazado'; ip: string | null }

const card: React.CSSProperties = { background: '#fff', border: '1.5px solid #e4e4e2', borderRadius: 10, padding: 16 }
const btn: React.CSSProperties = { padding: '7px 12px', border: '1.5px solid #e4e4e2', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#f0f0ee', color: '#555', whiteSpace: 'nowrap' }
const btnMain: React.CSSProperties = { ...btn, background: '#f15922', color: '#fff', border: 'none', fontWeight: 700 }
const inp: React.CSSProperties = { padding: '8px 12px', border: '1.5px solid #e4e4e2', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', width: '100%' }
const th: React.CSSProperties = { padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', borderBottom: '1px solid #e4e4e2', background: '#f7f7f5' }
const td: React.CSSProperties = { padding: '9px 12px', fontSize: 12, borderBottom: '1px solid #f0f0ee', verticalAlign: 'top' }

function fmtFecha(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

const TIPO: Record<Acceso['tipo'], { txt: string; bg: string; fg: string }> = {
  login: { txt: 'Ingresó', bg: '#e8f5e9', fg: '#2e7d32' },
  visita: { txt: 'Volvió', bg: '#eef3ff', fg: '#3554a5' },
  rechazado: { txt: 'Rechazado', bg: '#fce4ec', fg: '#c62828' },
}

export default function AccesosPanel({ onSesionVencida }: { onSesionVencida: () => void }) {
  const [vista, setVista] = useState<'clientes' | 'registro' | 'excel'>('clientes')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [accesos, setAccesos] = useState<Acceso[]>([])
  const [cargando, setCargando] = useState(true)
  const [msg, setMsg] = useState('')
  const [buscar, setBuscar] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [editando, setEditando] = useState<{ id?: string; nombre: string; emails: string; cuit: string } | null>(null)

  // Excel
  const fileRef = useRef<HTMLInputElement>(null)
  const [lectura, setLectura] = useState<LecturaClientes | null>(null)
  const [archivo, setArchivo] = useState('')
  const [desactivarFaltantes, setDesactivarFaltantes] = useState(true)
  const [aplicando, setAplicando] = useState(false)
  const [restringido, setRestringido] = useState<boolean | null>(null)
  const [cambiandoRestr, setCambiandoRestr] = useState(false)

  function aviso(t: string) { setMsg(t); setTimeout(() => setMsg(''), 5000) }

  async function getJson(url: string) {
    const res = await fetch(url, { cache: 'no-store' })
    if (res.status === 401) { onSesionVencida(); return null }
    return res.json().catch(() => null)
  }

  async function cargar() {
    setCargando(true)
    const [c, a, r] = await Promise.all([getJson('/api/admin/clientes'), getJson('/api/admin/accesos'), getJson('/api/admin/acceso-restringido')])
    if (r?.ok) setRestringido(r.valor)
    if (c?.ok) setClientes(c.data)
    if (a?.ok) setAccesos(a.data)
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  const activos = clientes.filter(c => c.activo).length
  const hoy = new Date().toDateString()
  const ingresosHoy = new Set(accesos.filter(a => a.tipo !== 'rechazado' && new Date(a.created_at).toDateString() === hoy).map(a => a.cliente_id || a.cliente_nombre)).size
  const rechazados7d = accesos.filter(a => a.tipo === 'rechazado' && Date.now() - new Date(a.created_at).getTime() < 7 * 864e5).length
  const nuncaEntraron = clientes.filter(c => c.activo && !c.ultimo_acceso).length

  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    const qd = q.replace(/\D/g, '')
    return clientes.filter(c => {
      if (soloActivos && !c.activo) return false
      if (!q) return true
      return (c.nombre || '').toLowerCase().includes(q) || c.emails.some(e => e.includes(q)) || (!!qd && (c.cuit || '').includes(qd))
    })
  }, [clientes, buscar, soloActivos])

  // ── Vista previa del Excel (el servidor vuelve a calcular todo al aplicar) ──
  const previa = useMemo(() => {
    if (!lectura) return null
    const porCuit = new Map<string, Cliente>(), porEmail = new Map<string, Cliente>()
    for (const c of clientes) { if (c.cuit) porCuit.set(c.cuit, c); c.emails.forEach(e => porEmail.set(e, c)) }
    const tocados = new Set<string>(); const nuevos = new Set<string>()
    for (const f of lectura.filas) {
      const ex = (f.cuit && porCuit.get(f.cuit)) || f.emails.map(e => porEmail.get(e)).find(Boolean)
      if (ex) tocados.add(ex.id); else nuevos.add(f.cuit || f.emails[0])
    }
    const salen = clientes.filter(c => c.activo && !tocados.has(c.id))
    return { nuevos: nuevos.size, actualizados: tocados.size, salen }
  }, [lectura, clientes])

  async function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try {
      setLectura(await leerClientes(f)); setArchivo(f.name)
    } catch (err: any) {
      setLectura(null); aviso('❌ ' + (err?.message || 'No pude leer el archivo'))
    }
  }

  async function aplicarExcel() {
    if (!lectura) return
    setAplicando(true)
    const r = await adminPost('/api/admin/clientes', { importar: lectura.filas, desactivarFaltantes })
    setAplicando(false)
    if (!r.ok) { if (r.status === 401) onSesionVencida(); aviso('❌ ' + r.error); return }
    aviso(`✅ Listo: ${r.data.nuevos} nuevos, ${r.data.actualizados} actualizados${r.data.desactivados ? `, ${r.data.desactivados} sin acceso` : ''}.`)
    setLectura(null); setArchivo(''); setVista('clientes')
    await cargar()
  }

  async function cambiarRestringido() {
    if (restringido === null) return
    const nuevo = !restringido
    if (nuevo && !confirm(`Desde ahora solo van a poder entrar los ${activos} distribuidores habilitados. ¿Activar?`)) return
    if (!nuevo && !confirm('La web va a quedar abierta para cualquiera que tenga el link. ¿Desactivar el ingreso?')) return
    setCambiandoRestr(true)
    const r = await adminPost('/api/admin/acceso-restringido', { valor: nuevo })
    setCambiandoRestr(false)
    if (!r.ok) { if (r.status === 401) onSesionVencida(); aviso('❌ ' + r.error); return }
    setRestringido(nuevo)
    aviso(nuevo ? '🔐 Listo: la web ahora pide ingreso' : '🔓 La web quedó abierta')
  }

  async function guardar(body: Record<string, unknown>, ok: string) {
    const r = await adminPost('/api/admin/clientes', body)
    if (!r.ok) { if (r.status === 401) onSesionVencida(); aviso('❌ ' + r.error); return false }
    aviso(ok); await cargar(); return true
  }

  async function guardarEdicion() {
    if (!editando) return
    if (!editando.cuit.trim()) { aviso('❌ Falta el CUIT'); return }
    const body = { ...(editando.id ? { id: editando.id } : {}), nombre: editando.nombre, cuit: editando.cuit.trim() }
    if (await guardar(body, editando.id ? '✅ Cambios guardados' : '✅ Distribuidor agregado')) setEditando(null)
  }

  async function borrar(c: Cliente) {
    if (!confirm(`¿Borrar a ${c.nombre || fmtCuit(c.cuit)}? Pierde el acceso. Su historial queda registrado.`)) return
    const res = await fetch('/api/admin/clientes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id }) })
    if (res.status === 401) { onSesionVencida(); return }
    aviso(res.ok ? '🗑 Borrado' : '❌ No se pudo borrar'); await cargar()
  }

  function descargarModelo() {
    const csv = 'Razón social;CUIT\nCIRUGIA LITORAL S.R.L;30-71005390-8\nMICELLI FERNANDO ANDRES;23246651949\n'
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'modelo-distribuidores.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const subTab = (k: typeof vista, txt: string) => (
    <button key={k} onClick={() => setVista(k)} style={{ padding: '8px 14px', border: 'none', borderBottom: `3px solid ${vista === k ? '#f15922' : 'transparent'}`, background: 'transparent', fontSize: 13, fontWeight: vista === k ? 700 : 500, color: vista === k ? '#f15922' : '#888', cursor: 'pointer' }}>{txt}</button>
  )

  return (
    <div style={{ padding: '20px 28px' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>Accesos de distribuidores</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>
        Con el ingreso activado, solo los distribuidores de esta lista pueden entrar a la web, con su CUIT (con o sin guiones). Vos, con la sesión del admin abierta, también la podés ver.
      </div>

      {/* Interruptor */}
      {restringido !== null && (
        <div style={{ ...card, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, borderColor: restringido ? '#c8e6c9' : '#ffe0b2', background: restringido ? '#f6fbf6' : '#fffaf2' }}>
          <div style={{ fontSize: 26 }}>{restringido ? '🔐' : '🔓'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{restringido ? 'La web pide ingreso' : 'La web está abierta para cualquiera con el link'}</div>
            <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
              {restringido ? 'Solo entran los distribuidores habilitados, con su CUIT. Cada ingreso queda registrado.'
                : 'Cargá la lista de distribuidores y después activá el ingreso.'}
            </div>
          </div>
          <button onClick={cambiarRestringido} disabled={cambiandoRestr}
            style={restringido ? btn : { ...btnMain, padding: '9px 16px' }}>
            {cambiandoRestr ? 'Cambiando…' : restringido ? 'Desactivar ingreso' : 'Activar ingreso'}
          </button>
        </div>
      )}

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          ['Con acceso', activos, '#1a1a1a'],
          ['Entraron hoy', ingresosHoy, '#2e7d32'],
          ['Nunca entraron', nuncaEntraron, '#888'],
          ['Rechazados (7 días)', rechazados7d, rechazados7d ? '#c62828' : '#888'],
        ].map(([t, n, col]) => (
          <div key={t as string} style={{ ...card, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888' }}>{t}</div>
            <div style={{ fontFamily: 'Barlow Condensed,sans-serif', fontSize: 28, fontWeight: 900, color: col as string, lineHeight: 1.1 }}>{n as number}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e4e4e2', marginBottom: 16 }}>
        {subTab('clientes', `Distribuidores (${clientes.length})`)}
        {subTab('registro', 'Registro de ingresos')}
        {subTab('excel', '⬆️ Subir Excel')}
      </div>

      {msg && <div style={{ fontSize: 13, fontWeight: 600, padding: '9px 12px', background: '#f0f0ee', borderRadius: 6, marginBottom: 12 }}>{msg}</div>}
      {cargando && <div style={{ color: '#888', padding: 30, textAlign: 'center' }}>Cargando...</div>}

      {/* ── Distribuidores ── */}
      {!cargando && vista === 'clientes' && (<>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <input style={{ ...inp, width: 280 }} placeholder="Buscar por razón social o CUIT…" value={buscar} onChange={e => setBuscar(e.target.value)} />
          <label style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} /> Solo con acceso
          </label>
          <button style={{ ...btnMain, marginLeft: 'auto' }} onClick={() => setEditando({ nombre: '', emails: '', cuit: '' })}>+ Agregar distribuidor</button>
        </div>

        {editando && (
          <div style={{ ...card, marginBottom: 12, display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: 10, alignItems: 'end' }}>
            {([['Razón social', 'nombre', 'Ej: Cirugía Litoral S.R.L.'], ['CUIT', 'cuit', '30-71005390-8']] as const).map(([lab, k, ph]) => (
              <div key={k}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 5 }}>{lab}</div>
                <input style={inp} placeholder={ph} value={editando[k]} onChange={e => setEditando({ ...editando, [k]: e.target.value })} onKeyDown={e => e.key === 'Enter' && guardarEdicion()} />
              </div>
            ))}
            <button style={btnMain} onClick={guardarEdicion}>Guardar</button>
            <button style={btn} onClick={() => setEditando(null)}>Cancelar</button>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <thead><tr>
              <th style={th}>Razón social</th><th style={th}>CUIT</th>
              <th style={th}>Último ingreso</th><th style={th}>Ingresos</th><th style={th}>Acceso</th><th style={th}></th>
            </tr></thead>
            <tbody>
              {lista.map(c => (
                <tr key={c.id} style={{ opacity: c.activo ? 1 : 0.55 }}>
                  <td style={{ ...td, fontWeight: 700, color: '#1a1a1a' }}>{c.nombre || <span style={{ color: '#bbb', fontWeight: 400 }}>Sin nombre</span>}</td>
                  <td style={{ ...td, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{fmtCuit(c.cuit) || <span style={{ color: '#bbb' }}>—</span>}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap', color: c.ultimo_acceso ? '#1a1a1a' : '#bbb' }}>{c.ultimo_acceso ? fmtFecha(c.ultimo_acceso) : 'Nunca'}</td>
                  <td style={td}>{c.accesos}</td>
                  <td style={td}>
                    <button onClick={() => guardar({ id: c.id, activo: !c.activo }, c.activo ? '🚫 Sin acceso' : '✅ Con acceso')}
                      style={{ ...btn, border: 'none', fontWeight: 700, background: c.activo ? '#e8f5e9' : '#fce4ec', color: c.activo ? '#2e7d32' : '#c62828' }}>
                      {c.activo ? 'Habilitado' : 'Bloqueado'}
                    </button>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button style={btn} onClick={() => setEditando({ id: c.id, nombre: c.nombre || '', emails: '', cuit: fmtCuit(c.cuit) })}>Editar</button>{' '}
                    <button style={{ ...btn, color: '#c62828' }} onClick={() => borrar(c)}>Borrar</button>
                  </td>
                </tr>
              ))}
              {!lista.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#bbb', padding: 36 }}>
                {clientes.length ? 'No hay resultados' : 'Todavía no cargaste distribuidores. Subí el Excel desde "Subir Excel".'}
              </td></tr>}
            </tbody>
          </table>
        </div>
      </>)}

      {/* ── Registro ── */}
      {!cargando && vista === 'registro' && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
            Últimos {accesos.length} movimientos. "Volvió" = entró de nuevo con la sesión guardada (se anota como máximo cada 30 minutos). <button style={{ ...btn, marginLeft: 8 }} onClick={cargar}>🔄 Actualizar</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <thead><tr><th style={th}>Fecha</th><th style={th}>Distribuidor</th><th style={th}>CUIT ingresado</th><th style={th}>Resultado</th></tr></thead>
            <tbody>
              {accesos.map(a => (
                <tr key={a.id}>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtFecha(a.created_at)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{a.cliente_nombre || <span style={{ color: '#bbb', fontWeight: 400 }}>No está en la lista</span>}</td>
                  <td style={{ ...td, fontFamily: /^\d{11}$/.test(a.identificador || '') ? 'monospace' : undefined }}>{/^\d{11}$/.test(a.identificador || '') ? fmtCuit(a.identificador) : a.identificador}</td>
                  <td style={td}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: TIPO[a.tipo].bg, color: TIPO[a.tipo].fg }}>{TIPO[a.tipo].txt}</span></td>
                </tr>
              ))}
              {!accesos.length && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#bbb', padding: 36 }}>Todavía no entró nadie</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Subir Excel ── */}
      {!cargando && vista === 'excel' && (
        <div style={{ maxWidth: 760 }}>
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>
              Subí un Excel (.xlsx) o CSV con una fila por distribuidor y dos columnas con título: <b>Razón social</b> y <b>CUIT</b>.
              El CUIT puede estar con o sin guiones.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={elegirArchivo} />
              <button style={btnMain} onClick={() => fileRef.current?.click()}>Elegir archivo</button>
              <button style={btn} onClick={descargarModelo}>Descargar modelo</button>
            </div>
          </div>

          {lectura && previa && (
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{archivo}</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Columnas detectadas: {lectura.columnas || '—'}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                {[['Nuevos', previa.nuevos, '#2e7d32'], ['Ya cargados (se actualizan)', previa.actualizados, '#3554a5'], ['Filas sin CUIT válido (se ignoran)', lectura.invalidas, '#888']].map(([t, n, c]) => (
                  <div key={t as string} style={{ background: '#f7f7f5', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                    <b style={{ color: c as string, fontSize: 16 }}>{n as number}</b> {t}
                  </div>
                ))}
              </div>

              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer', marginBottom: 6 }}>
                <input type="checkbox" checked={desactivarFaltantes} onChange={e => setDesactivarFaltantes(e.target.checked)} style={{ marginTop: 3 }} />
                <span>Quitar el acceso a los que <b>no están</b> en este Excel ({previa.salen.length})<br />
                  <span style={{ fontSize: 11, color: '#888' }}>No se borran: quedan bloqueados con su historial y los podés volver a habilitar.</span></span>
              </label>
              {desactivarFaltantes && previa.salen.length > 0 && (
                <div style={{ fontSize: 12, color: '#c62828', background: '#fff5f5', borderRadius: 6, padding: '8px 10px', marginBottom: 6, maxHeight: 120, overflowY: 'auto' }}>
                  {previa.salen.map(c => c.nombre || fmtCuit(c.cuit)).join(' · ')}
                </div>
              )}

              <div style={{ fontSize: 12, color: '#555', margin: '12px 0 8px' }}>Primeras filas:</div>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #f0f0ee', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {lectura.filas.slice(0, 50).map((f, i) => (
                      <tr key={i}>
                        <td style={td}>{f.nombre || <span style={{ color: '#bbb' }}>—</span>}</td>
                        <td style={{ ...td, fontFamily: 'monospace' }}>{fmtCuit(f.cuit) || <span style={{ color: '#bbb' }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
                <button style={btn} onClick={() => { setLectura(null); setArchivo('') }}>Cancelar</button>
                <button style={btnMain} disabled={aplicando} onClick={aplicarExcel}>{aplicando ? 'Aplicando…' : `Aplicar (${lectura.filas.length} filas)`}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
