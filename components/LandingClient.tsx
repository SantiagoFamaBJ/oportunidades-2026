'use client'
import { useState, useMemo } from 'react'
import { Producto } from '@/lib/supabase'
import { LOGO_B64 } from '@/lib/logo'

const fmt = (n: number) => '$\u00a0' + Math.round(n).toLocaleString('es-AR')
const fmtDate = (iso: string) => { const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}` }
const pct = (pub: number, out: number) => Math.round((1 - out / pub) * 100)

const IMG_FNS = [
  (k:string) => `https://dentalmedrano.com/wp-content/uploads/2025/12/${k}-500x500.jpg`,
  (k:string) => `https://dentalmedrano.com/wp-content/uploads/2025/11/${k}-500x500.jpg`,
  (k:string) => `https://dentalmedrano.com/wp-content/uploads/2025/10/${k}-500x500.jpg`,
  (k:string) => `https://dentalmedrano.com/wp-content/uploads/2025/05/${k}-500x500.jpg`,
  (k:string) => `https://dentalmedrano.com/wp-content/uploads/2024/04/${k}-500x500.jpg`,
  (k:string) => `https://dentalmedrano.com/wp-content/uploads/2025/12/${k}-450x450.jpg`,
]

function getUrls(p: Producto) {
  const key = p.codigo.split('-')[0].replace(/^0+/,'') || '0'
  const urls = IMG_FNS.map(fn => fn(key))
  if (p.imagen_url) urls.unshift(p.imagen_url)
  return urls
}

function Img({ p, h }: { p: Producto; h: number }) {
  const [i, setI] = useState(0)
  const [fail, setFail] = useState(false)
  const urls = useMemo(() => getUrls(p), [p.id, p.imagen_url])
  if (fail) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,opacity:.15}}>
      <svg width={h*.36} height={h*.36} viewBox="0 0 40 40" fill="none" stroke="#999" strokeWidth="1.3">
        <rect x="4" y="4" width="32" height="32" rx="4"/><circle cx="15" cy="15" r="4"/><path d="m4 26 9-9 7 7 5-5 11 11"/>
      </svg>
      <span style={{fontSize:9,fontFamily:'Barlow Condensed,sans-serif',letterSpacing:1}}>sin imagen</span>
    </div>
  )
  return <img src={urls[i]} alt={p.nombre} style={{width:'100%',height:'100%',objectFit:'contain',padding:h>140?16:8}}
    onError={()=>i+1<urls.length?setI(x=>x+1):setFail(true)}/>
}

const SORTS = [
  {label:'Mayor descuento', fn:(a:Producto,b:Producto)=>pct(b.precio_publico,b.precio_outlet)-pct(a.precio_publico,a.precio_outlet)},
  {label:'Vence primero',   fn:(a:Producto,b:Producto)=>a.fecha_venc.localeCompare(b.fecha_venc)},
  {label:'Menor precio',    fn:(a:Producto,b:Producto)=>a.precio_outlet-b.precio_outlet},
  {label:'Mayor precio',    fn:(a:Producto,b:Producto)=>b.precio_outlet-a.precio_outlet},
]
const CATS = ['Todas','Composites','Siliconas','Adhesivos','Blanqueamiento','Cementos y Restauradores','Descartables y Accesorios','Otros']

function Modal({p, onClose}:{p:Producto;onClose:()=>void}) {
  const d = pct(p.precio_publico, p.precio_outlet)
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(5px)'}}>
      <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:540,maxHeight:'90vh',overflowY:'auto',position:'relative',boxShadow:'0 24px 80px rgba(0,0,0,0.25)',animation:'pop .22s cubic-bezier(.34,1.56,.64,1)'}}>
        <button onClick={onClose} style={{position:'absolute',top:12,right:12,background:'rgba(0,0,0,0.08)',border:'none',width:32,height:32,borderRadius:'50%',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#888',zIndex:5}}>✕</button>
        <div style={{height:220,background:'#f5f5f3',borderRadius:'16px 16px 0 0',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
          <Img p={p} h={220}/>
        </div>
        <div style={{padding:'22px 26px 28px',fontFamily:'Barlow,sans-serif'}}>
          {p.es_urgente&&<div style={{display:'inline-flex',alignItems:'center',gap:5,background:'#e53935',color:'#fff',fontFamily:'Barlow Condensed,sans-serif',fontSize:11,fontWeight:800,padding:'3px 10px',borderRadius:4,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>⚡ Vencimiento urgente</div>}
          <div style={{fontSize:11,fontWeight:700,color:'#f15922',letterSpacing:2,textTransform:'uppercase',marginBottom:4,fontFamily:'Barlow Condensed,sans-serif'}}>{p.codigo}</div>
          <div style={{fontSize:17,fontWeight:700,lineHeight:1.4,marginBottom:6,color:'#1a1a1a'}}>{p.nombre}</div>
          <div style={{fontSize:12,color:'#aaa',marginBottom:20}}>Categoría: {p.categoria}</div>
          <div style={{background:'linear-gradient(135deg,#fff4f0,#fff8f5)',border:'2px solid #ffd0b8',borderLeft:'5px solid #f15922',borderRadius:12,padding:'18px 20px',marginBottom:18}}>
            <div style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:1.2,color:'#f15922',marginBottom:4}}>Precio Outlet (c/IVA)</div>
            <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:52,fontWeight:900,color:'#f15922',lineHeight:1,letterSpacing:-1,marginBottom:8}}>{fmt(p.precio_outlet)}</div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:13,color:'#aaa',textDecoration:'line-through'}}>{fmt(p.precio_publico)}</span>
              <span style={{background:'#e53935',color:'#fff',fontFamily:'Barlow Condensed,sans-serif',fontWeight:800,fontSize:13,padding:'2px 8px',borderRadius:4}}>−{d}%</span>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
            {[{l:'Vencimiento',v:fmtDate(p.fecha_venc),r:p.es_urgente},{l:'Stock disponible',v:`${p.stock} unidades`,r:false},{l:'Lote',v:p.lote,r:false}].map(({l,v,r})=>(
              <div key={l} style={{background:'#f7f7f5',borderRadius:8,padding:'10px 12px',border:'1px solid #e4e4e2'}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#bbb',marginBottom:4}}>{l}</div>
                <div style={{fontSize:13,fontWeight:700,color:r?'#e53935':'#1a1a1a'}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:12,color:'#aaa',textAlign:'center',padding:'12px 0 0',borderTop:'1px solid #e4e4e2'}}>Pedido aparte · especificar oportunidades · consultar mínimos</div>
        </div>
      </div>
    </div>
  )
}

function CardGrid({p,onClick}:{p:Producto;onClick:()=>void}) {
  const d = pct(p.precio_publico, p.precio_outlet)
  const [hov,setHov] = useState(false)
  const shadow = hov
    ? (p.es_urgente?'0 0 0 2px #e53935,0 0 24px 5px rgba(229,57,53,.22),0 8px 20px rgba(0,0,0,.10)':'0 0 0 2px #f15922,0 0 20px 4px rgba(241,89,34,.20),0 8px 20px rgba(0,0,0,.10)')
    : (p.es_urgente?'0 0 0 1px #ffd0ce,0 0 16px 3px rgba(229,57,53,.18),0 3px 10px rgba(0,0,0,.05)':'0 2px 8px rgba(0,0,0,.05)')
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:'#fff',borderRadius:12,border:p.es_urgente?'2px solid #ffd0ce':'1.5px solid #e4e4e2',display:'flex',flexDirection:'column',cursor:'pointer',position:'relative',overflow:'hidden',transition:'transform .18s,box-shadow .18s',transform:hov?'translateY(-4px)':'none',boxShadow:shadow}}>
      {p.es_urgente&&<div style={{position:'absolute',top:8,left:8,zIndex:2,background:'#e53935',color:'#fff',fontFamily:'Barlow Condensed,sans-serif',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:4,letterSpacing:1,textTransform:'uppercase'}}>⚡ Urgente</div>}
      <div style={{position:'absolute',top:8,right:8,zIndex:2,background:d>=60?'#e53935':d>=40?'#f15922':'#555',color:'#fff',fontFamily:'Barlow Condensed,sans-serif',fontSize:16,fontWeight:900,padding:'4px 10px',borderRadius:6,letterSpacing:.5,lineHeight:1}}>−{d}%</div>
      <div style={{height:120,background:p.es_urgente?'#fff8f7':'#f7f7f5',borderBottom:'1px solid #e4e4e2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
        <Img p={p} h={120}/>
      </div>
      <div style={{padding:'10px 12px 12px',display:'flex',flexDirection:'column',gap:6,flex:1}}>
        <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:10,fontWeight:700,color:'#ccc',letterSpacing:1.2,textTransform:'uppercase'}}>{p.codigo}</div>
        <div style={{fontSize:12,fontWeight:600,lineHeight:1.4,color:'#1a1a1a',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden',minHeight:50}}>{p.nombre}</div>
        <div style={{marginTop:'auto',paddingTop:8,borderTop:'1px solid #f0f0ee'}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#f15922',marginBottom:2}}>Precio Outlet</div>
          <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:26,fontWeight:900,color:'#f15922',lineHeight:1,letterSpacing:-0.5}}>{fmt(p.precio_outlet)}</div>
          <div style={{fontSize:11,color:'#ccc',textDecoration:'line-through',marginTop:2}}>{fmt(p.precio_publico)}</div>
        </div>
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:600,color:p.es_urgente?'#e53935':'#888',background:p.es_urgente?'#fff5f5':'#f5f5f3',padding:'3px 7px',borderRadius:4,border:`1px solid ${p.es_urgente?'#ffd0ce':'#e4e4e2'}`}}>🗓 {fmtDate(p.fecha_venc)}</span>
          <span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:600,color:'#888',background:'#f5f5f3',padding:'3px 7px',borderRadius:4,border:'1px solid #e4e4e2'}}>📦 {p.stock}</span>
        </div>
        <div style={{fontSize:9,color:'#ccc',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Lote: {p.lote}</div>
      </div>
    </div>
  )
}

function CardList({p,onClick}:{p:Producto;onClick:()=>void}) {
  const d = pct(p.precio_publico, p.precio_outlet)
  const [hov,setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:'#fff',borderRadius:10,border:p.es_urgente?'1.5px solid #ffd0ce':'1.5px solid #e4e4e2',display:'flex',alignItems:'center',gap:16,padding:'12px 18px',cursor:'pointer',transition:'box-shadow .15s,transform .15s',transform:hov?'translateX(3px)':'',boxShadow:hov?'0 0 0 1.5px #f15922,0 0 16px 3px rgba(241,89,34,.18)':(p.es_urgente?'0 0 12px 2px rgba(229,57,53,.15)':'0 2px 6px rgba(0,0,0,.04)')}}>
      <div style={{width:64,height:64,flexShrink:0,background:'#f5f5f3',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        <Img p={p} h={64}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:10,color:'#ccc',fontFamily:'Barlow Condensed,sans-serif',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:2}}>{p.codigo}</div>
        <div style={{fontSize:13,fontWeight:600,lineHeight:1.35,color:'#1a1a1a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.nombre}</div>
        <div style={{fontSize:11,color:'#ccc',marginTop:3}}>Lote: {p.lote} · {p.categoria}</div>
      </div>
      <div style={{flexShrink:0,textAlign:'center',minWidth:90}}>
        <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#bbb',marginBottom:3}}>Vence</div>
        <div style={{fontSize:13,fontWeight:700,color:p.es_urgente?'#e53935':'#1a1a1a'}}>{fmtDate(p.fecha_venc)}</div>
      </div>
      <div style={{flexShrink:0,textAlign:'center',minWidth:70}}>
        <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#bbb',marginBottom:3}}>Stock</div>
        <div style={{fontSize:13,fontWeight:700}}>{p.stock}</div>
      </div>
      <div style={{flexShrink:0,textAlign:'right',minWidth:150}}>
        <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#f15922',marginBottom:2}}>Precio Outlet</div>
        <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:24,fontWeight:900,color:'#f15922',lineHeight:1}}>{fmt(p.precio_outlet)}</div>
        <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end',marginTop:3}}>
          <span style={{fontSize:11,color:'#ccc',textDecoration:'line-through'}}>{fmt(p.precio_publico)}</span>
          <span style={{background:'#e53935',color:'#fff',fontSize:10,fontWeight:800,padding:'1px 6px',borderRadius:3,fontFamily:'Barlow Condensed,sans-serif'}}>−{d}%</span>
        </div>
      </div>
      {p.es_urgente&&<div style={{flexShrink:0,background:'#e53935',color:'#fff',fontFamily:'Barlow Condensed,sans-serif',fontSize:9,fontWeight:800,padding:'3px 7px',borderRadius:3,letterSpacing:0.8,textTransform:'uppercase'}}>⚡</div>}
    </div>
  )
}

export default function LandingClient({productos}:{productos:Producto[]}) {
  const [filterUrg,setFilterUrg] = useState(false)
  const [cat,setCat] = useState('Todas')
  const [sortIdx,setSortIdx] = useState(1)
  const [search,setSearch] = useState('')
  const [view,setView] = useState<'grid'|'list'>('grid')
  const [selected,setSelected] = useState<Producto|null>(null)

  const urgCount = useMemo(()=>productos.filter(p=>p.es_urgente).length,[productos])

  const filtered = useMemo(()=>{
    let items = productos.filter(p=>{
      if(filterUrg&&!p.es_urgente) return false
      if(cat!=='Todas'&&p.categoria!==cat) return false
      if(search){const q=search.toLowerCase();if(!p.nombre.toLowerCase().includes(q)&&!p.codigo.toLowerCase().includes(q)) return false}
      return true
    })
    const sorted = [...items].sort(SORTS[sortIdx].fn)
    return [...sorted.filter(p=>p.es_urgente),...sorted.filter(p=>!p.es_urgente)]
  },[productos,filterUrg,cat,sortIdx,search])

  return(<>
    <style>{`@keyframes pop{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}*{box-sizing:border-box}body{margin:0;font-family:'Barlow',sans-serif;background:#f0f0ee}input,button,select{font-family:inherit}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}`}</style>

    {/* HEADER */}
    <header style={{background:'#fff',borderBottom:'3px solid #f15922',padding:'14px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:10,position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 20px rgba(0,0,0,0.07)'}}>
      <img src={LOGO_B64} alt="Dental Medrano" style={{height:40,width:'auto'}}/>
      <div style={{textAlign:'center'}}>
        <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:'clamp(24px,5vw,36px)',fontWeight:900,color:'#f15922',letterSpacing:3,textTransform:'uppercase',lineHeight:1}}>Oportunidades 2026</div>
        <div style={{fontSize:11,color:'#aaa',letterSpacing:.5,fontWeight:500,textTransform:'uppercase',marginTop:4}}>Precios especiales · Stock limitado · Consultar mínimos</div>
      </div>
      <div style={{background:'#fff5f5',border:'1.5px solid #ffd0ce',borderRadius:10,padding:'6px 18px',textAlign:'center'}}>
        <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:26,fontWeight:900,color:'#e53935',lineHeight:1}}>{urgCount} productos con vencimiento urgente</div>
      </div>
    </header>

    {/* CONTROLS */}
    <div style={{background:'#fff',borderBottom:'1px solid #e4e4e2',padding:'10px 16px',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',position:'sticky',top:119,zIndex:99}}>
      <input type="search" placeholder="🔍  Buscar…" value={search} onChange={e=>setSearch(e.target.value)}
        style={{padding:'8px 14px',border:'1.5px solid #e4e4e2',borderRadius:8,fontSize:14,flex:1,minWidth:140,background:'#f7f7f5',color:'#1a1a1a',outline:'none'}}/>
      <button onClick={()=>setFilterUrg(v=>!v)}
        style={{padding:'8px 14px',borderRadius:8,border:'1.5px solid',fontSize:13,fontWeight:700,cursor:'pointer',transition:'all .15s',background:filterUrg?'#e53935':'#fff5f5',borderColor:filterUrg?'#e53935':'#ffd0ce',color:filterUrg?'#fff':'#e53935',whiteSpace:'nowrap'}}>
        ⚡ Urgentes
      </button>
      <select value={sortIdx} onChange={e=>setSortIdx(Number(e.target.value))}
        style={{padding:'8px 10px',border:'1.5px solid #e4e4e2',borderRadius:8,fontSize:13,background:'#f7f7f5',color:'#555',cursor:'pointer',outline:'none'}}>
        {SORTS.map((s,i)=><option key={i} value={i}>{s.label}</option>)}
      </select>
      <div style={{display:'flex',gap:4}}>
        {(['grid','list'] as const).map(v=>(
          <button key={v} onClick={()=>setView(v)} title={v==='grid'?'Cuadrícula':'Lista'}
            style={{width:34,height:34,borderRadius:7,border:'1.5px solid',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,transition:'all .15s',background:view===v?'#f15922':'#f7f7f5',borderColor:view===v?'#f15922':'#e4e4e2',color:view===v?'#fff':'#888'}}>
            {v==='grid'?'⊞':'☰'}
          </button>
        ))}
      </div>
      <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:13,color:'#aaa',fontWeight:600,whiteSpace:'nowrap'}}>{filtered.length} productos</div>
    </div>

    {/* CATEGORY TABS */}
    <div style={{background:'#fff',borderBottom:'1px solid #e4e4e2',padding:'0 8px',display:'flex',gap:0,overflowX:'auto',position:'sticky',top:173,zIndex:98,WebkitOverflowScrolling:'touch'} as React.CSSProperties}>
      {CATS.map(c=>(
        <button key={c} onClick={()=>setCat(c)}
          style={{padding:'10px 14px',border:'none',borderBottom:`3px solid ${cat===c?'#f15922':'transparent'}`,background:'transparent',fontSize:13,fontWeight:cat===c?700:500,color:cat===c?'#f15922':'#888',cursor:'pointer',whiteSpace:'nowrap',transition:'all .15s'}}>
          {c}
        </button>
      ))}
    </div>

    {/* PRODUCTS */}
    <div style={{maxWidth:1700,margin:'16px auto 60px',padding:'0 12px',...(view==='grid'?{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}:{display:'flex',flexDirection:'column',gap:8})}}>
      {filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:80,color:'#bbb',fontSize:16}}>No se encontraron productos</div>}
      {filtered.map(p=>
        view==='grid'
          ?<CardGrid key={p.id} p={p} onClick={()=>setSelected(p)}/>
          :<CardList key={p.id} p={p} onClick={()=>setSelected(p)}/>
      )}
    </div>

    {/* FOOTER */}
    <footer style={{background:'#111',color:'#666',textAlign:'center',padding:'24px 20px',fontSize:13}}>
      <strong style={{color:'#fff'}}>Dental Medrano</strong>{' · '}
      <a href="https://dentalmedrano.com" target="_blank" rel="noreferrer" style={{color:'#f15922',textDecoration:'none'}}>dentalmedrano.com</a>
      <div style={{marginTop:8,fontSize:11,color:'#444',maxWidth:540,marginLeft:'auto',marginRight:'auto'}}>
        Pedido aparte, especificar oportunidades. El mínimo de unidades correspondiente a cada artículo es el que está en la lista 1.
      </div>
    </footer>

    {selected&&<Modal p={selected} onClose={()=>setSelected(null)}/>}
  </>)
}
