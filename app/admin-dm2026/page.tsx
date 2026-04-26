'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase, Producto } from '@/lib/supabase'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'dm2026admin'
const BUCKET = 'product-images'
const STORAGE_BASE = 'https://larqxmgyutqiktsforgz.supabase.co/storage/v1/object/public/product-images'

function getStorageUrl(id: string): string {
  return `${STORAGE_BASE}/${id}.jpg?v=${new Date().toISOString().slice(0,10)}`
}
function fmt(n: number) { return '$ ' + Math.round(n).toLocaleString('es-AR') }
function fmtDate(iso: string) { const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}` }

export default function AdminPage(): JSX.Element {
  const [auth, setAuth] = useState(false)
  const [pass, setPass] = useState('')
  const [passErr, setPassErr] = useState(false)
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Producto | null>(null)
  const [saveMsg, setSaveMsg] = useState('')
  const [filter, setFilter] = useState<'all'|'urgente'|'ocultos'|'sin_imagen'>('all')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Categorías
  const [cats, setCats] = useState<string[]>([])
  const [newCat, setNewCat] = useState('')
  const [showCats, setShowCats] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('dm_admin_auth') === '1') setAuth(true)
    }
  }, [])

  async function login() {
    if (pass === ADMIN_PASSWORD) {
      sessionStorage.setItem('dm_admin_auth', '1')
      setAuth(true)
    } else {
      setPassErr(true)
      setTimeout(() => setPassErr(false), 2000)
    }
  }

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase.from('productos_oportunidades').select('*')
      .order('es_urgente', { ascending: false }).order('fecha_venc', { ascending: true })
    setProductos(data || [])
    // Extraer categorías únicas
    const uniqueCats = Array.from(new Set((data || []).map((p: Producto) => p.categoria).filter(Boolean))).sort() as string[]
    setCats(uniqueCats)
    setLoading(false)
  }

  useEffect(() => { if (auth) loadProducts() }, [auth])

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${editing!.id}.${ext}`
    setUploading(true)
    setSaveMsg('Subiendo imagen...')
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setSaveMsg('❌ Error: ' + error.message); setUploading(false); return null }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    setUploading(false)
    setSaveMsg('✅ Imagen subida')
    return data.publicUrl + '?t=' + Date.now()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editing) return
    const url = await uploadImage(file)
    if (url) setEditing({ ...editing, imagen_url: url })
  }

  async function saveEdit() {
    if (!editing) return
    setSaveMsg('Guardando...')
    const { error } = await supabase.from('productos_oportunidades').update({
      stock: editing.stock,
      imagen_url: editing.imagen_url,
      activo: editing.activo,
      precio_outlet: editing.precio_outlet,
      lote: editing.lote,
      categoria: editing.categoria,
    }).eq('id', editing.id)
    if (error) {
      setSaveMsg('❌ Error: ' + error.message)
    } else {
      setSaveMsg('✅ Guardado')
      setProductos(prev => prev.map(p => p.id === editing.id ? editing : p))
      // Actualizar lista de categorías
      const updatedCats = Array.from(new Set([...cats, editing.categoria].filter(Boolean))).sort()
      setCats(updatedCats)
      setTimeout(() => { setSaveMsg(''); setEditing(null) }, 1200)
    }
  }

  async function addCat() {
    const c = newCat.trim()
    if (!c || cats.includes(c)) return
    setCats(prev => [...prev, c].sort())
    setNewCat('')
  }

  async function removeCat(cat: string) {
    const inUse = productos.filter(p => p.categoria === cat).length
    if (inUse > 0 && !confirm(`"${cat}" está en uso por ${inUse} producto(s). ¿Eliminar de todos modos?`)) return
    setCats(prev => prev.filter(c => c !== cat))
  }

  const filtered = productos.filter(p => {
    if (filter === 'urgente' && !p.es_urgente) return false
    if (filter === 'ocultos' && p.activo) return false
    if (filter === 'sin_imagen' && p.imagen_url) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.nombre.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false
    }
    return true
  })

  const sinImagen = productos.filter(p => !p.imagen_url).length

  if (!auth) return (
    <div style={s.loginWrap}>
      <div style={s.loginBox}>
        <div style={s.loginLogo}>DM</div>
        <div style={s.loginTitle}>Admin Panel</div>
        <div style={s.loginSub}>Oportunidades 2026</div>
        <input style={{...s.loginInput,...(passErr?s.loginInputErr:{})}} type="password" placeholder="Contraseña"
          value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} autoFocus/>
        {passErr && <div style={s.errMsg}>Contraseña incorrecta</div>}
        <button style={s.loginBtn} onClick={login}>Ingresar</button>
      </div>
    </div>
  )

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.headerTitle}>Admin · Oportunidades 2026</span>
          <span style={s.headerCount}>{productos.length} productos</span>
          {sinImagen > 0 && <span style={s.headerWarn}>⚠️ {sinImagen} sin imagen</span>}
        </div>
        <div style={s.headerRight}>
          <button style={{...s.fBtn,...(showCats?s.fBtnActive:{})}} onClick={()=>setShowCats(v=>!v)}>🏷 Categorías</button>
          <a href="/" target="_blank" style={s.viewLink}>Ver landing →</a>
          <button style={s.logoutBtn} onClick={()=>{sessionStorage.removeItem('dm_admin_auth');setAuth(false)}}>Salir</button>
        </div>
      </div>

      {/* Panel de categorías */}
      {showCats && (
        <div style={{background:'#fffdf5',borderBottom:'1px solid #f0e0a0',padding:'14px 28px'}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:'#b88a00'}}>Gestión de Categorías</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:12}}>
            {cats.map(c=>(
              <div key={c} style={{display:'flex',alignItems:'center',gap:6,background:'#fff',border:'1.5px solid #e4e4e2',borderRadius:6,padding:'4px 10px',fontSize:12}}>
                <span>{c}</span>
                <button onClick={()=>removeCat(c)} style={{background:'none',border:'none',color:'#e53935',cursor:'pointer',fontSize:14,padding:0,lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <input value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCat()}
              placeholder="Nueva categoría…" style={{padding:'7px 12px',border:'1.5px solid #e4e4e2',borderRadius:6,fontSize:13,outline:'none',width:220}}/>
            <button onClick={addCat} style={{padding:'7px 14px',background:'#f15922',color:'#fff',border:'none',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer'}}>Agregar</button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={s.controls}>
        <input style={s.search} type="search" placeholder="Buscar…" value={search} onChange={e=>setSearch(e.target.value)}/>
        {(['all','urgente','sin_imagen','ocultos'] as const).map(f=>(
          <button key={f} style={{...s.fBtn,...(filter===f?s.fBtnActive:{})}} onClick={()=>setFilter(f)}>
            {f==='all'?'Todos':f==='urgente'?'🔴 Urgentes':f==='sin_imagen'?'📷 Sin imagen':'🚫 Ocultos'}
          </button>
        ))}
        <span style={s.counter}>{filtered.length} mostrando</span>
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        {loading ? <div style={s.loading}>Cargando...</div> : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Código</th>
                <th style={{...s.th,width:260}}>Nombre</th>
                <th style={s.th}>Categoría</th>
                <th style={s.th}>Vence</th>
                <th style={s.th}>Stock</th>
                <th style={s.th}>Outlet</th>
                <th style={s.th}>Imagen</th>
                <th style={s.th}>Visible</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p.id} style={{...s.tr,...(p.es_urgente?s.trRojo:{}),...(!p.activo?s.trOculto:{})}}>
                  <td style={s.td}><span style={s.cod}>{p.id}</span></td>
                  <td style={{...s.td,fontSize:12,lineHeight:'1.3'}}>{p.nombre}</td>
                  <td style={s.td}><span style={{fontSize:11,color:'#888'}}>{p.categoria||'—'}</span></td>
                  <td style={{...s.td,...(p.es_urgente?s.urgText:{})}}>{fmtDate(p.fecha_venc)}</td>
                  <td style={s.td}>{p.stock}</td>
                  <td style={s.td}>{fmt(p.precio_outlet)}</td>
                  <td style={s.td}>
                    {(()=>{
                      const url = p.imagen_url || getStorageUrl(p.id)
                      return <img src={url} alt="" style={{width:40,height:40,objectFit:'contain',borderRadius:4,border:'1px solid #eee',background:'#f5f5f3'}}
                        onError={e=>{e.currentTarget.style.opacity='0.15'}}/>
                    })()}
                  </td>
                  <td style={s.td}>
                    <span style={{...s.pill,background:p.activo?'#e8f5e9':'#fce4ec',color:p.activo?'#2e7d32':'#c62828'}}>
                      {p.activo?'Visible':'Oculto'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <button style={s.editBtn} onClick={()=>{setEditing({...p});setSaveMsg('')}}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div style={s.overlay} onClick={e=>{if(e.target===e.currentTarget)setEditing(null)}}>
          <div style={s.modal}>
            <div style={s.modalTitle}>Editar producto</div>
            <div style={s.modalCod}>{editing.id}</div>
            <div style={s.modalNombre}>{editing.nombre}</div>

            <div style={s.formGrid}>
              <div style={s.formGroup}>
                <label style={s.label}>Stock</label>
                <input style={s.input} type="number" value={editing.stock}
                  onChange={e=>setEditing({...editing,stock:parseInt(e.target.value)||0})}/>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Precio Outlet</label>
                <input style={s.input} type="number" value={editing.precio_outlet}
                  onChange={e=>setEditing({...editing,precio_outlet:parseFloat(e.target.value)||0})}/>
              </div>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Lote</label>
              <input style={s.input} type="text" value={editing.lote||''}
                onChange={e=>setEditing({...editing,lote:e.target.value})}/>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Categoría</label>
              <select style={{...s.input,cursor:'pointer'}} value={editing.categoria||''}
                onChange={e=>setEditing({...editing,categoria:e.target.value})}>
                <option value="">Sin categoría</option>
                {cats.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Imagen del producto</label>
              {(()=>{
                const previewUrl = editing.imagen_url || getStorageUrl(editing.id)
                return (
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                    <img src={previewUrl} alt="preview"
                      style={{width:80,height:80,objectFit:'contain',border:'1px solid #e4e4e2',borderRadius:8,background:'#f5f5f3'}}
                      onError={e=>{e.currentTarget.style.opacity='0.1'}}/>
                    <div style={{fontSize:12,color:'#888',lineHeight:1.6}}>
                      {editing.imagen_url?'Imagen en tabla':'Imagen desde Storage'}<br/>
                      <span style={{fontSize:11,color:'#bbb'}}>{previewUrl.split('/').pop()?.split('?')[0]}</span><br/>
                      <span style={{fontSize:11,color:'#f15922',cursor:'pointer',textDecoration:'underline'}} onClick={()=>fileRef.current?.click()}>
                        Reemplazar imagen
                      </span>
                    </div>
                  </div>
                )
              })()}
              <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFileChange}/>
              <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                style={{width:'100%',padding:'12px',border:'2px dashed #e4e4e2',borderRadius:10,background:'#f9f9f9',cursor:uploading?'wait':'pointer',fontSize:13,color:'#888',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#f15922';e.currentTarget.style.background='#fff4f0'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#e4e4e2';e.currentTarget.style.background='#f9f9f9'}}>
                {uploading?'⏳ Subiendo...':'📷 Seleccionar imagen'}
              </button>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Visibilidad</label>
              <div style={s.toggleRow}>
                <button style={{...s.toggleBtn,...(editing.activo?s.toggleActive:{})}} onClick={()=>setEditing({...editing,activo:true})}>Visible en landing</button>
                <button style={{...s.toggleBtn,...(!editing.activo?s.toggleHide:{})}} onClick={()=>setEditing({...editing,activo:false})}>Ocultar</button>
              </div>
            </div>

            {saveMsg&&<div style={s.saveMsg}>{saveMsg}</div>}
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={()=>setEditing(null)}>Cancelar</button>
              <button style={s.saveBtn} onClick={saveEdit} disabled={uploading}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string,React.CSSProperties> = {
  loginWrap:{minHeight:'100vh',background:'#f0f0ee',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Barlow,sans-serif'},
  loginBox:{background:'#fff',borderRadius:14,padding:40,width:340,boxShadow:'0 8px 40px rgba(0,0,0,0.12)',display:'flex',flexDirection:'column',alignItems:'center',gap:12},
  loginLogo:{width:56,height:56,background:'#f15922',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:20},
  loginTitle:{fontSize:20,fontWeight:700,color:'#1a1a1a'},
  loginSub:{fontSize:12,color:'#888',marginTop:-6},
  loginInput:{width:'100%',padding:'10px 14px',border:'1.5px solid #e4e4e2',borderRadius:8,fontSize:14,outline:'none'},
  loginInputErr:{borderColor:'#e53935',background:'#fff5f5'},
  errMsg:{fontSize:12,color:'#e53935',fontWeight:600},
  loginBtn:{width:'100%',padding:11,background:'#f15922',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:700,cursor:'pointer',marginTop:4},
  wrap:{minHeight:'100vh',background:'#f0f0ee',fontFamily:'Barlow,sans-serif'},
  header:{background:'#fff',borderBottom:'3px solid #f15922',padding:'12px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'},
  headerLeft:{display:'flex',alignItems:'center',gap:12},
  headerTitle:{fontSize:16,fontWeight:700,color:'#f15922'},
  headerCount:{fontSize:12,color:'#888',background:'#f0f0ee',padding:'3px 10px',borderRadius:20},
  headerWarn:{fontSize:12,color:'#e65100',background:'#fff3e0',padding:'3px 10px',borderRadius:20,fontWeight:600},
  headerRight:{display:'flex',alignItems:'center',gap:10},
  viewLink:{fontSize:12,color:'#f15922',textDecoration:'none',fontWeight:600},
  logoutBtn:{padding:'6px 14px',background:'transparent',border:'1.5px solid #e4e4e2',borderRadius:6,fontSize:12,cursor:'pointer',color:'#888'},
  controls:{background:'#fff',borderBottom:'1px solid #e4e4e2',padding:'9px 28px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'},
  search:{padding:'7px 13px',border:'1.5px solid #e4e4e2',borderRadius:6,fontSize:13,width:220,background:'#f0f0ee'},
  fBtn:{padding:'5px 12px',border:'1.5px solid #e4e4e2',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',background:'#f0f0ee',color:'#888'},
  fBtnActive:{background:'#f15922',color:'#fff',borderColor:'#f15922'},
  counter:{marginLeft:'auto',fontSize:12,color:'#888',fontWeight:600},
  tableWrap:{padding:'20px 28px',overflowX:'auto'},
  loading:{textAlign:'center',padding:60,color:'#888'},
  table:{width:'100%',borderCollapse:'collapse',background:'#fff',borderRadius:10,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',fontSize:13},
  thead:{background:'#f7f7f5'},
  th:{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#888',borderBottom:'1px solid #e4e4e2'},
  tr:{borderBottom:'1px solid #f0f0ee'},
  trRojo:{background:'#fff9f9'},
  trOculto:{opacity:0.5},
  td:{padding:'10px 12px',verticalAlign:'middle'},
  cod:{fontFamily:'monospace',fontSize:11,background:'#f0f0ee',padding:'2px 6px',borderRadius:4},
  urgText:{color:'#e53935',fontWeight:700},
  pill:{padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600},
  editBtn:{padding:'5px 12px',background:'#f15922',color:'#fff',border:'none',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer'},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'},
  modal:{background:'#fff',borderRadius:14,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto',padding:28,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'},
  modalTitle:{fontSize:16,fontWeight:700,marginBottom:4},
  modalCod:{fontFamily:'monospace',fontSize:11,color:'#f15922',fontWeight:700,letterSpacing:1,marginBottom:4},
  modalNombre:{fontSize:13,color:'#444',lineHeight:1.4,marginBottom:20,paddingBottom:16,borderBottom:'1px solid #e4e4e2'},
  formGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12},
  formGroup:{display:'flex',flexDirection:'column',gap:5,marginBottom:14},
  label:{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#888'},
  input:{padding:'8px 12px',border:'1.5px solid #e4e4e2',borderRadius:7,fontSize:13,outline:'none'},
  toggleRow:{display:'flex',gap:8},
  toggleBtn:{flex:1,padding:8,border:'1.5px solid #e4e4e2',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',background:'#f0f0ee',color:'#888'},
  toggleActive:{background:'#e8f5e9',borderColor:'#4caf50',color:'#2e7d32'},
  toggleHide:{background:'#fce4ec',borderColor:'#e53935',color:'#c62828'},
  saveMsg:{fontSize:13,fontWeight:600,padding:'8px 12px',background:'#f0f0ee',borderRadius:6,marginBottom:12,textAlign:'center'},
  modalActions:{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8},
  cancelBtn:{padding:'9px 20px',background:'transparent',border:'1.5px solid #e4e4e2',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',color:'#888'},
  saveBtn:{padding:'9px 24px',background:'#f15922',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'},
}
