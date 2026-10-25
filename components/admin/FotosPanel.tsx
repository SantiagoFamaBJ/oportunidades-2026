'use client'
import { useMemo, useRef, useState } from 'react'
import { Producto } from '@/lib/supabase'
import { codigoDesdeArchivo, subirFoto, borrarFoto } from '@/lib/fotos'

type Resultado = { archivo: string; ok: boolean; detalle: string }

export default function FotosPanel({ productos, fotos, onChange }: {
  productos: Producto[]
  fotos: Record<string, string>
  onChange: () => void
}) {
  const multiRef = useRef<HTMLInputElement>(null)
  const unoRef = useRef<HTMLInputElement>(null)
  const [destino, setDestino] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [res, setRes] = useState<Resultado[]>([])
  const [q, setQ] = useState('')

  // Un renglón por código activo (la foto es por código, sirve para todos sus lotes)
  const activos = useMemo(() => {
    const m = new Map<string, Producto>()
    for (const p of productos) if (p.activo && !m.has(p.codigo)) m.set(p.codigo, p)
    return Array.from(m.values()).sort((a, b) => a.codigo.localeCompare(b.codigo))
  }, [productos])
  const faltan = activos.filter(p => !fotos[p.codigo])
  const nombres = useMemo(() => new Map(productos.map(p => [p.codigo, p.nombre])), [productos])
  const biblioteca = Object.entries(fotos)
    .filter(([c]) => !q || c.toLowerCase().includes(q.toLowerCase()) || (nombres.get(c) || '').toLowerCase().includes(q.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b))

  async function subirVarias(files: File[]) {
    if (!files.length) return
    setBusy(true)
    const out: Resultado[] = []
    for (const f of files) {
      const codigo = codigoDesdeArchivo(f.name)
      if (!codigo) { out.push({ archivo: f.name, ok: false, detalle: 'El nombre no empieza con un código (ej. 021220-A2000.jpg)' }); continue }
      const r = await subirFoto(codigo, f)
      out.push(r.error
        ? { archivo: f.name, ok: false, detalle: r.error }
        : { archivo: f.name, ok: true, detalle: nombres.has(codigo) ? `→ ${codigo}` : `→ ${codigo} (guardada; ese código no está en la lista ahora)` })
      setRes([...out])
    }
    setBusy(false)
    onChange()
  }

  async function subirUna(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !destino) return
    setBusy(true)
    const r = await subirFoto(destino, f)
    setRes([{ archivo: f.name, ok: !r.error, detalle: r.error || `→ ${destino}` }])
    setBusy(false); setDestino(null)
    onChange()
  }

  async function borrar(codigo: string) {
    if (!confirm(`¿Borrar la foto de ${codigo}?`)) return
    const e = await borrarFoto(codigo, fotos[codigo])
    if (e) alert('Error: ' + e)
    onChange()
  }

  return (
    <div style={{ padding: '20px 28px', display: 'grid', gap: 16 }}>
      <input ref={multiRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => { const fs = Array.from(e.target.files || []); e.target.value = ''; subirVarias(fs) }} />
      <input ref={unoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={subirUna} />

      {/* Subida masiva */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); subirVarias(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))) }}
        onClick={() => !busy && multiRef.current?.click()}
        style={{ ...card, border: `2px dashed ${drag ? '#f15922' : '#e4e4e2'}`, background: drag ? '#fff4f0' : '#fff', textAlign: 'center', cursor: busy ? 'wait' : 'pointer', padding: 28 }}>
        <div style={{ fontSize: 28 }}>📷</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>{busy ? 'Subiendo…' : 'Arrastrá las fotos acá o hacé click'}</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
          Nombrá cada archivo con el código del producto (ej. <code>021220-A2000.jpg</code>). Se asigna sola a todos los lotes de ese código. Si ya tenía foto, se reemplaza.
        </div>
      </div>

      {res.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            Resultado: {res.filter(r => r.ok).length} asignadas · {res.filter(r => !r.ok).length} con error
          </div>
          {res.map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: r.ok ? '#2e7d32' : '#c62828', padding: '2px 0' }}>{r.ok ? '✓' : '✗'} {r.archivo} {r.detalle}</div>
          ))}
        </div>
      )}

      {/* Faltan fotos */}
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
          {faltan.length ? `⚠️ Faltan ${faltan.length} foto${faltan.length !== 1 ? 's' : ''} de productos visibles` : '✅ Todos los productos visibles tienen foto'}
        </div>
        {faltan.map(p => (
          <div key={p.codigo} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderTop: '1px solid #f0f0ee' }}>
            <code style={cod}>{p.codigo}</code>
            <span style={{ fontSize: 12, flex: 1 }}>{p.nombre}</span>
            <button style={btnSm} disabled={busy} onClick={() => { setDestino(p.codigo); unoRef.current?.click() }}>Subir foto</button>
          </div>
        ))}
      </div>

      {/* Biblioteca */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Biblioteca ({Object.keys(fotos).length})</div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar código o nombre…"
            style={{ marginLeft: 'auto', padding: '6px 12px', border: '1.5px solid #e4e4e2', borderRadius: 6, fontSize: 12, width: 220 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
          {biblioteca.map(([codigo, url]) => (
            <div key={codigo} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', background: '#fafafa' }}>
              <img src={url} alt={codigo} style={{ width: '100%', height: 110, objectFit: 'contain', background: '#fff' }} />
              <div style={{ padding: '6px 8px' }}>
                <code style={{ ...cod, fontSize: 10 }}>{codigo}</code>
                <div style={{ fontSize: 10, color: '#888', height: 26, overflow: 'hidden', marginTop: 3 }}>{nombres.get(codigo) || 'No está en la lista'}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button style={{ ...btnSm, flex: 1, padding: '3px 0' }} onClick={() => { setDestino(codigo); unoRef.current?.click() }}>Cambiar</button>
                  <button style={{ ...btnSm, background: '#fff5f5', color: '#e53935', border: '1px solid #ffd0ce', padding: '3px 8px' }} onClick={() => borrar(codigo)}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
const btnSm: React.CSSProperties = { padding: '5px 12px', background: '#f15922', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }
const cod: React.CSSProperties = { fontFamily: 'monospace', fontSize: 11, background: '#f0f0ee', padding: '2px 6px', borderRadius: 4 }
