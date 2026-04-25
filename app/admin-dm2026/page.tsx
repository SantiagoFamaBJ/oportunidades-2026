'use client'
import { useState, useEffect } from 'react'
import { supabase, Producto } from '@/lib/supabase'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'dm2026admin'

function fmt(n: number) {
  return '$ ' + Math.round(n).toLocaleString('es-AR')
}
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function AdminPage() {
  const [auth, setAuth] = useState(false)
  const [pass, setPass] = useState('')
  const [passErr, setPassErr] = useState(false)
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Producto | null>(null)
  const [saveMsg, setSaveMsg] = useState('')
  const [filter, setFilter] = useState<'all' | 'urgente' | 'ocultos'>('all')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ok = sessionStorage.getItem('dm_admin_auth')
      if (ok === '1') setAuth(true)
    }
  }, [])

  async function login() {
    if (pass === ADMIN_PASSWORD) {
      sessionStorage.setItem('dm_admin_auth', '1')
      setAuth(true)
      loadProducts()
    } else {
      setPassErr(true)
      setTimeout(() => setPassErr(false), 2000)
    }
  }

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase
      .from('productos_oportunidades')
      .select('*')
      .order('es_urgente', { ascending: false })
      .order('fecha_venc', { ascending: true })
    setProductos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (auth) loadProducts()
  }, [auth])

  async function saveEdit() {
    if (!editing) return
    setSaveMsg('Guardando...')
    const { error } = await supabase
      .from('productos_oportunidades')
      .update({
        stock: editing.stock,
        imagen_url: editing.imagen_url,
        activo: editing.activo,
        precio_outlet: editing.precio_outlet,
      })
      .eq('id', editing.id)
    if (error) {
      setSaveMsg('❌ Error: ' + error.message)
    } else {
      setSaveMsg('✅ Guardado')
      setProductos(prev => prev.map(p => p.id === editing.id ? editing : p))
      setTimeout(() => { setSaveMsg(''); setEditing(null) }, 1200)
    }
  }

  const filtered = productos.filter(p => {
    if (filter === 'urgente' && !p.es_urgente) return false
    if (filter === 'ocultos' && p.activo) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.nombre.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false
    }
    return true
  })

  if (!auth) {
    return (
      <div style={s.loginWrap}>
        <div style={s.loginBox}>
          <div style={s.loginLogo}>DM</div>
          <div style={s.loginTitle}>Admin Panel</div>
          <div style={s.loginSub}>Oportunidades 2026</div>
          <input
            style={{ ...s.loginInput, ...(passErr ? s.loginInputErr : {}) }}
            type="password"
            placeholder="Contraseña"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            autoFocus
          />
          {passErr && <div style={s.errMsg}>Contraseña incorrecta</div>}
          <button style={s.loginBtn} onClick={login}>Ingresar</button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.headerTitle}>Admin · Oportunidades 2026</span>
          <span style={s.headerCount}>{productos.length} productos</span>
        </div>
        <div style={s.headerRight}>
          <a href="/" target="_blank" style={s.viewLink}>Ver landing →</a>
          <button style={s.logoutBtn} onClick={() => { sessionStorage.removeItem('dm_admin_auth'); setAuth(false) }}>
            Salir
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={s.controls}>
        <input
          style={s.search}
          type="search"
          placeholder="Buscar por nombre o código…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {(['all','urgente','ocultos'] as const).map(f => (
          <button
            key={f}
            style={{ ...s.fBtn, ...(filter === f ? s.fBtnActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todos' : f === 'urgente' ? '🔴 Urgentes' : '🚫 Ocultos'}
          </button>
        ))}
        <span style={s.counter}>{filtered.length} mostrando</span>
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        {loading ? (
          <div style={s.loading}>Cargando...</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Código</th>
                <th style={{ ...s.th, width: '280px' }}>Nombre</th>
                <th style={s.th}>Vence</th>
                <th style={s.th}>Stock</th>
                <th style={s.th}>Outlet</th>
                <th style={s.th}>Imagen URL</th>
                <th style={s.th}>Visible</th>
                <th style={s.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id + p.lote} style={{ ...s.tr, ...(p.es_urgente ? s.trRojo : {}), ...(!p.activo ? s.trOculto : {}) }}>
                  <td style={s.td}><span style={s.cod}>{p.id}</span></td>
                  <td style={{ ...s.td, fontSize: '12px', lineHeight: '1.3' }}>{p.nombre}</td>
                  <td style={{ ...s.td, ...(p.es_urgente ? s.urgText : {}) }}>{fmtDate(p.fecha_venc)}</td>
                  <td style={s.td}>{p.stock}</td>
                  <td style={s.td}>{fmt(p.precio_outlet)}</td>
                  <td style={s.td}>
                    <span style={s.imgUrl}>{p.imagen_url ? '✅ Con imagen' : '⬜ Sin imagen'}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.pill, background: p.activo ? '#e8f5e9' : '#fce4ec', color: p.activo ? '#2e7d32' : '#c62828' }}>
                      {p.activo ? 'Visible' : 'Oculto'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button style={s.editBtn} onClick={() => setEditing({ ...p })}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
          <div style={s.modal}>
            <div style={s.modalTitle}>Editar producto</div>
            <div style={s.modalCod}>{editing.id}</div>
            <div style={s.modalNombre}>{editing.nombre}</div>

            <div style={s.formGrid}>
              <div style={s.formGroup}>
                <label style={s.label}>Stock</label>
                <input
                  style={s.input}
                  type="number"
                  value={editing.stock}
                  onChange={e => setEditing({ ...editing, stock: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Precio Outlet</label>
                <input
                  style={s.input}
                  type="number"
                  value={editing.precio_outlet}
                  onChange={e => setEditing({ ...editing, precio_outlet: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>URL de imagen</label>
              <input
                style={s.input}
                type="url"
                placeholder="https://..."
                value={editing.imagen_url || ''}
                onChange={e => setEditing({ ...editing, imagen_url: e.target.value })}
              />
              {editing.imagen_url && (
                <img
                  src={editing.imagen_url}
                  alt="preview"
                  style={s.imgPreview}
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              )}
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Visibilidad</label>
              <div style={s.toggleRow}>
                <button
                  style={{ ...s.toggleBtn, ...(editing.activo ? s.toggleActive : {}) }}
                  onClick={() => setEditing({ ...editing, activo: true })}
                >Visible en landing</button>
                <button
                  style={{ ...s.toggleBtn, ...(!editing.activo ? s.toggleHide : {}) }}
                  onClick={() => setEditing({ ...editing, activo: false })}
                >Ocultar</button>
              </div>
            </div>

            {saveMsg && <div style={s.saveMsg}>{saveMsg}</div>}

            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setEditing(null)}>Cancelar</button>
              <button style={s.saveBtn} onClick={saveEdit}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  loginWrap: { minHeight: '100vh', background: '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow, sans-serif' },
  loginBox: { background: '#fff', borderRadius: '14px', padding: '40px', width: '340px', boxShadow: '0 8px 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  loginLogo: { width: '56px', height: '56px', background: '#f15922', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '20px', letterSpacing: '1px' },
  loginTitle: { fontSize: '20px', fontWeight: 700, color: '#1a1a1a' },
  loginSub: { fontSize: '12px', color: '#888', marginTop: '-6px' },
  loginInput: { width: '100%', padding: '10px 14px', border: '1.5px solid #e4e4e2', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border-color .15s' },
  loginInputErr: { borderColor: '#e53935', background: '#fff5f5' },
  errMsg: { fontSize: '12px', color: '#e53935', fontWeight: 600 },
  loginBtn: { width: '100%', padding: '11px', background: '#f15922', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' },
  wrap: { minHeight: '100vh', background: '#f0f0ee', fontFamily: 'Barlow, sans-serif' },
  header: { background: '#fff', borderBottom: '3px solid #f15922', padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  headerTitle: { fontSize: '16px', fontWeight: 700, color: '#f15922' },
  headerCount: { fontSize: '12px', color: '#888', background: '#f0f0ee', padding: '3px 10px', borderRadius: '20px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  viewLink: { fontSize: '12px', color: '#f15922', textDecoration: 'none', fontWeight: 600 },
  logoutBtn: { padding: '6px 14px', background: 'transparent', border: '1.5px solid #e4e4e2', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#888' },
  controls: { background: '#fff', borderBottom: '1px solid #e4e4e2', padding: '9px 28px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: '55px', zIndex: 99 },
  search: { padding: '7px 13px', border: '1.5px solid #e4e4e2', borderRadius: '6px', fontSize: '13px', width: '220px', background: '#f0f0ee' },
  fBtn: { padding: '5px 12px', border: '1.5px solid #e4e4e2', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: '#f0f0ee', color: '#888' },
  fBtnActive: { background: '#f15922', color: '#fff', borderColor: '#f15922' },
  counter: { marginLeft: 'auto', fontSize: '12px', color: '#888', fontWeight: 600 },
  tableWrap: { padding: '20px 28px', overflowX: 'auto' },
  loading: { textAlign: 'center', padding: '60px', color: '#888' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', fontSize: '13px' },
  thead: { background: '#f7f7f5' },
  th: { padding: '10px 12px', textAlign: 'left' as const, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', color: '#888', borderBottom: '1px solid #e4e4e2' },
  tr: { borderBottom: '1px solid #f0f0ee', transition: 'background .1s' },
  trRojo: { background: '#fff9f9' },
  trOculto: { opacity: 0.5 },
  td: { padding: '10px 12px', verticalAlign: 'middle' as const },
  cod: { fontFamily: 'monospace', fontSize: '11px', background: '#f0f0ee', padding: '2px 6px', borderRadius: '4px' },
  urgText: { color: '#e53935', fontWeight: 700 },
  imgUrl: { fontSize: '11px', color: '#888' },
  pill: { padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 },
  editBtn: { padding: '5px 12px', background: '#f15922', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' },
  modal: { background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: '16px', fontWeight: 700, marginBottom: '4px' },
  modalCod: { fontFamily: 'monospace', fontSize: '11px', color: '#f15922', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' },
  modalNombre: { fontSize: '13px', color: '#444', lineHeight: '1.4', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e4e4e2' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' },
  label: { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', color: '#888' },
  input: { padding: '8px 12px', border: '1.5px solid #e4e4e2', borderRadius: '7px', fontSize: '13px', outline: 'none' },
  imgPreview: { width: '80px', height: '80px', objectFit: 'contain', border: '1px solid #e4e4e2', borderRadius: '6px', marginTop: '6px', background: '#f5f5f3' },
  toggleRow: { display: 'flex', gap: '8px' },
  toggleBtn: { flex: 1, padding: '8px', border: '1.5px solid #e4e4e2', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: '#f0f0ee', color: '#888' },
  toggleActive: { background: '#e8f5e9', borderColor: '#4caf50', color: '#2e7d32' },
  toggleHide: { background: '#fce4ec', borderColor: '#e53935', color: '#c62828' },
  saveMsg: { fontSize: '13px', fontWeight: 600, padding: '8px 12px', background: '#f0f0ee', borderRadius: '6px', marginBottom: '12px', textAlign: 'center' as const },
  modalActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' as const, marginTop: '8px' },
  cancelBtn: { padding: '9px 20px', background: 'transparent', border: '1.5px solid #e4e4e2', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#888' },
  saveBtn: { padding: '9px 24px', background: '#f15922', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
}
