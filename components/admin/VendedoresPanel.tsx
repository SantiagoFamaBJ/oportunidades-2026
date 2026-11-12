'use client'
import { useEffect, useState } from 'react'
import { adminPost } from '@/lib/adminApi'

type Vendedor = { id: string; nombre: string; whatsapp: string; activo: boolean; orden: number }

// Solo separo Buenos Aires (11); las otras características varían de largo
const fmtWa = (wa: string) => {
  if (!wa.startsWith('549') || wa.length !== 13) return `+${wa}`
  const r = wa.slice(3)
  return r.startsWith('11') ? `+54 9 11 ${r.slice(2, 6)}-${r.slice(6)}` : `+54 9 ${r}`
}

const inp: React.CSSProperties = { padding: '8px 12px', border: '1.5px solid #e4e4e2', borderRadius: 7, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
const btn: React.CSSProperties = { padding: '7px 12px', border: '1.5px solid #e4e4e2', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#f0f0ee', color: '#555', whiteSpace: 'nowrap' }
const btnMain: React.CSSProperties = { ...btn, background: '#f15922', color: '#fff', border: 'none', fontWeight: 700 }

export default function VendedoresPanel({ onSesionVencida }: { onSesionVencida: () => void }) {
  const [lista, setLista] = useState<Vendedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [msg, setMsg] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', whatsapp: '' })
  const [nuevo, setNuevo] = useState({ nombre: '', whatsapp: '' })
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    setCargando(true)
    const res = await fetch('/api/admin/vendedores')
    if (res.status === 401) { onSesionVencida(); return }
    const j = await res.json().catch(() => ({}))
    setLista(j.data || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  function aviso(t: string) { setMsg(t); setTimeout(() => setMsg(''), 3500) }

  async function guardar(body: Record<string, unknown>, ok: string) {
    setGuardando(true)
    const r = await adminPost('/api/admin/vendedores', body)
    setGuardando(false)
    if (!r.ok) { if (r.status === 401) onSesionVencida(); aviso('❌ ' + r.error); return false }
    aviso(ok)
    await cargar()
    return true
  }

  async function agregar() {
    if (await guardar(nuevo, '✅ Vendedor agregado')) setNuevo({ nombre: '', whatsapp: '' })
  }

  async function guardarEdicion(v: Vendedor) {
    if (await guardar({ id: v.id, ...form }, '✅ Cambios guardados')) setEditId(null)
  }

  async function mover(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= lista.length) return
    const a = lista[i], b = lista[j]
    // Intercambia posiciones (usa el índice si dos tienen el mismo orden)
    const oa = b.orden !== a.orden ? b.orden : j + 1
    const ob = b.orden !== a.orden ? a.orden : i + 1
    setLista(prev => { const c = [...prev]; c[i] = b; c[j] = a; return c })
    await adminPost('/api/admin/vendedores', { id: a.id, orden: oa })
    await adminPost('/api/admin/vendedores', { id: b.id, orden: ob })
    await cargar()
  }

  async function borrar(v: Vendedor) {
    if (!confirm(`¿Borrar a ${v.nombre}? Los pedidos que ya hizo quedan registrados con su nombre.`)) return
    try {
      const res = await fetch('/api/admin/vendedores', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: v.id }) })
      if (res.status === 401) { onSesionVencida(); return }
      if (!res.ok) { const j = await res.json().catch(() => ({})); aviso('❌ ' + (j.error || res.status)); return }
      aviso('🗑 Vendedor borrado')
      await cargar()
    } catch (e: any) { aviso('❌ ' + (e?.message || 'Sin conexión')) }
  }

  const activos = lista.filter(v => v.activo).length

  return (
    <div style={{ padding: '20px 28px', maxWidth: 820 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>Vendedores</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
        Son los que aparecen en el carrito de la web para enviar la consulta por WhatsApp. {activos} visible{activos !== 1 ? 's' : ''} en la web.
      </div>

      {/* Alta */}
      <div style={{ background: '#fff', border: '1.5px solid #e4e4e2', borderRadius: 10, padding: 14, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 5 }}>Nombre</div>
          <input style={inp} value={nuevo.nombre} placeholder="Ej: Juan Pérez" onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 5 }}>WhatsApp</div>
          <input style={inp} value={nuevo.whatsapp} placeholder="Ej: 11 3100-7959" onChange={e => setNuevo({ ...nuevo, whatsapp: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && agregar()} />
        </div>
        <button style={btnMain} disabled={guardando} onClick={agregar}>+ Agregar</button>
      </div>
      <div style={{ fontSize: 11, color: '#aaa', marginTop: -10, marginBottom: 16 }}>
        El WhatsApp podés escribirlo como quieras (con o sin espacios/guiones). Si es un celular argentino sin +54 9, se lo agrego solo.
      </div>

      {msg && <div style={{ fontSize: 13, fontWeight: 600, padding: '8px 12px', background: '#f0f0ee', borderRadius: 6, marginBottom: 12 }}>{msg}</div>}

      {cargando ? <div style={{ color: '#888', padding: 30, textAlign: 'center' }}>Cargando...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista.map((v, i) => (
            <div key={v.id} style={{ border: '1.5px solid #e4e4e2', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, background: v.activo ? '#fff' : '#fafafa' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button style={{ ...btn, padding: '0 6px', fontSize: 10, lineHeight: '16px' }} disabled={i === 0} onClick={() => mover(i, -1)} title="Subir">▲</button>
                <button style={{ ...btn, padding: '0 6px', fontSize: 10, lineHeight: '16px' }} disabled={i === lista.length - 1} onClick={() => mover(i, 1)} title="Bajar">▼</button>
              </div>

              {editId === v.id ? (
                <>
                  <input style={{ ...inp, flex: 1 }} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                  <input style={{ ...inp, flex: 1 }} value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && guardarEdicion(v)} />
                  <button style={btnMain} disabled={guardando} onClick={() => guardarEdicion(v)}>Guardar</button>
                  <button style={btn} onClick={() => setEditId(null)}>Cancelar</button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0, opacity: v.activo ? 1 : 0.5 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{v.nombre}</div>
                    <a href={`https://wa.me/${v.whatsapp}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#25a35a', textDecoration: 'none' }} title="Abrir chat de prueba">
                      📱 {fmtWa(v.whatsapp)}
                    </a>
                  </div>
                  <button
                    onClick={() => guardar({ id: v.id, activo: !v.activo }, v.activo ? '🚫 Oculto en la web' : '👁 Visible en la web')}
                    style={{ ...btn, border: 'none', fontWeight: 700, background: v.activo ? '#e8f5e9' : '#fce4ec', color: v.activo ? '#2e7d32' : '#c62828' }}
                    title="Mostrar/ocultar en el carrito de la web">
                    {v.activo ? 'Visible' : 'Oculto'}
                  </button>
                  <button style={btn} onClick={() => { setEditId(v.id); setForm({ nombre: v.nombre, whatsapp: v.whatsapp }) }}>Editar</button>
                  <button style={{ ...btn, color: '#c62828' }} onClick={() => borrar(v)}>Borrar</button>
                </>
              )}
            </div>
          ))}
          {!lista.length && <div style={{ color: '#bbb', padding: 30, textAlign: 'center' }}>No hay vendedores cargados</div>}
        </div>
      )}
    </div>
  )
}
