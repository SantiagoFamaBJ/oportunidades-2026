'use client'
import { useState, useMemo } from 'react'
import { Producto } from '@/lib/supabase'
import { LOGO_B64 } from '@/lib/logo'

const fmt = (n: number) => '$\u00a0' + Math.round(n).toLocaleString('es-AR')
const fmtDate = (iso: string) => { const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}` }
const pct = (pub: number, out: number) => Math.round((1 - out / pub) * 100)

const STORAGE_BASE = 'https://larqxmgyutqiktsforgz.supabase.co/storage/v1/object/public/product-images'
const BUST = new Date().toISOString().slice(0, 10)

function getUrls(p: Producto): string[] {
  const id = p.id
  const baseId = p.codigo
  return [
    `${STORAGE_BASE}/${id}.jpg?v=${BUST}`,
    `${STORAGE_BASE}/${id}.png?v=${BUST}`,
    `${STORAGE_BASE}/${id}.webp?v=${BUST}`,
    `${STORAGE_BASE}/${baseId}.jpg?v=${BUST}`,
    `${STORAGE_BASE}/${baseId}.png?v=${BUST}`,
  ]
}

function Img({ p, h }: { p: Producto; h: number }) {
  const [i, setI] = useState(0)
  const [fail, setFail] = useState(false)
  const urls = useMemo(() => getUrls(p), [p.id])
  if (fail) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,opacity:.15}}>
      <svg width={h*.36} height={h*.36} viewBox="0 0 40 40" fill="none" stroke="#999" strokeWidth="1.3">
        <rect x="4" y="4" width="32" height="32" rx="4"/><circle cx="15" cy="15" r="4"/><path d="m4 26 9-9 7 7 5-5 11 11"/>
      </svg>
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

function Modal({p, onClose}:{p:Producto;onClose:()=>void}) {
  const d = pct(p.precio_publico, p.precio_outlet)
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(5px)'}}>
      <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:500,maxHeight:'90vh',overflowY:'auto',position:'relative',boxShadow:'0 24px 80px rgba(0,0,0,0.25)',animation:'pop .22s cubic-bezier(.34,1.56,.64,1)'}}>
        <button onClick={onClose} style={{position:'absolute',top:12,right:12,background:'rgba(0,0,0,0.08)',border:'none',width:32,height:32,borderRadius:'50%',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#888',zIndex:5}}>✕</button>
        <div style={{height:200,background:'#f5f5f3',borderRadius:'16px 16px 0 0',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
          <Img p={p} h={200}/>
        </div>
        <div style={{padding:'20px 22px 26px',fontFamily:'Barlow,sans-serif'}}>
          {p.es_urgente&&<div style={{display:'inline-flex',alignItems:'center',gap:5,background:'#e53935',color:'#fff',fontFamily:'Barlow Condensed,sans-serif',fontSize:11,fontWeight:800,padding:'3px 10px',borderRadius:4,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>⚡ Vencimiento urgente</div>}
          <div style={{fontSize:11,fontWeight:700,color:'#f15922',letterSpacing:2,textTransform:'uppercase',marginBottom:4,fontFamily:'Barlow Condensed,sans-serif'}}>{p.codigo}</div>
          <div style={{fontSize:16,fontWeight:700,lineHeight:1.4,marginBottom:6,color:'#1a1a1a'}}>{p.nombre}</div>
          <div style={{fontSize:12,color:'#aaa',marginBottom:18}}>{p.categoria}</div>
          <div style={{background:'linear-gradient(135deg,#fff4f0,#fff8f5)',border:'2px solid #ffd0b8',borderLeft:'5px solid #f15922',borderRadius:12,padding:'16px 18px',marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:1.2,color:'#f15922',marginBottom:4}}>Precio Outlet (c/IVA)</div>
            <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:6}}>
              <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:44,fontWeight:900,color:'#f15922',lineHeight:1,letterSpacing:-1}}>{fmt(p.precio_outlet)}</div>
              <div style={{background:'#e53935',color:'#fff',fontFamily:'Barlow Condensed,sans-serif',fontWeight:900,fontSize:16,padding:'3px 8px',borderRadius:5}}>−{d}%</div>
            </div>
            <div style={{fontSize:13,color:'#aaa'}}>Precio público: <s>{fmt(p.precio_publico)}</s></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
            {[{l:'Vencimiento',v:fmtDate(p.fecha_venc),r:p.es_urgente},{l:'Stock',v:`${p.stock} u.`,r:false},{l:'Lote',v:p.lote,r:false}].map(({l,v,r})=>(
              <div key={l} style={{background:'#f7f7f5',borderRadius:8,padding:'10px 10px',border:'1px solid #e4e4e2'}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#bbb',marginBottom:4}}>{l}</div>
                <div style={{fontSize:12,fontWeight:700,color:r?'#e53935':'#1a1a1a',wordBreak:'break-all'}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:'#aaa',textAlign:'center',padding:'10px 0 0',borderTop:'1px solid #e4e4e2'}}>Pedido aparte · especificar oportunidades · consultar mínimos</div>
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
      <div style={{height:120,background:p.es_urgente?'#fff8f7':'#f7f7f5',borderBottom:'1px solid #e4e4e2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
        <Img p={p} h={120}/>
      </div>
      <div style={{padding:'10px 12px 12px',display:'flex',flexDirection:'column',gap:6,flex:1}}>
        <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:10,fontWeight:700,color:'#ccc',letterSpacing:1.2,textTransform:'uppercase'}}>{p.codigo}</div>
        <div style={{fontSize:12,fontWeight:600,lineHeight:1.4,color:'#1a1a1a',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden',minHeight:50}}>{p.nombre}</div>
        <div style={{marginTop:'auto',paddingTop:8,borderTop:'1px solid #f0f0ee'}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#f15922',marginBottom:2}}>Precio Outlet</div>
          <div style={{display:'flex',alignItems:'baseline',gap:6}}>
            <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:24,fontWeight:900,color:'#f15922',lineHeight:1,letterSpacing:-0.5}}>{fmt(p.precio_outlet)}</div>
            <div style={{background:d>=60?'#e53935':d>=40?'#f15922':'#555',color:'#fff',fontFamily:'Barlow Condensed,sans-serif',fontSize:14,fontWeight:900,padding:'2px 6px',borderRadius:4,lineHeight:1}}>−{d}%</div>
          </div>
          <div style={{fontSize:11,color:'#ccc',textDecoration:'line-through',marginTop:2}}>{fmt(p.precio_publico)}</div>
        </div>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
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
  return (
    <div onClick={onClick}
      style={{background:'#fff',borderRadius:10,border:p.es_urgente?'1.5px solid #ffd0ce':'1.5px solid #e4e4e2',display:'grid',gridTemplateColumns:'64px 1fr auto',alignItems:'center',gap:12,padding:'10px 14px',cursor:'pointer',boxShadow:p.es_urgente?'0 0 12px 2px rgba(229,57,53,.12)':'0 2px 6px rgba(0,0,0,.04)'}}>
      <div style={{width:64,height:64,flexShrink:0,background:'#f5f5f3',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        <Img p={p} h={64}/>
      </div>
      <div style={{minWidth:0}}>
        <div style={{fontSize:10,color:'#ccc',fontFamily:'Barlow Condensed,sans-serif',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:2}}>{p.codigo}</div>
        <div style={{fontSize:13,fontWeight:600,lineHeight:1.3,color:'#1a1a1a',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.nombre}</div>
        <div style={{fontSize:11,color:'#bbb',marginTop:3}}>Lote: {p.lote}</div>
      </div>
      <div style={{textAlign:'right',flexShrink:0}}>
        <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#f15922',marginBottom:2}}>Outlet</div>
        <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:20,fontWeight:900,color:'#f15922',lineHeight:1}}>{fmt(p.precio_outlet)}</div>
        <div style={{display:'flex',alignItems:'center',gap:5,justifyContent:'flex-end',marginTop:3}}>
          <span style={{fontSize:11,color:'#ccc',textDecoration:'line-through'}}>{fmt(p.precio_publico)}</span>
          <span style={{background:'#e53935',color:'#fff',fontSize:10,fontWeight:800,padding:'1px 5px',borderRadius:3,fontFamily:'Barlow Condensed,sans-serif'}}>−{d}%</span>
        </div>
        <div style={{fontSize:10,fontWeight:700,color:p.es_urgente?'#e53935':'#888',marginTop:4}}>📅 {fmtDate(p.fecha_venc)}</div>
      </div>
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
  const cats = useMemo(()=>['Todas',...Array.from(new Set(productos.map(p=>p.categoria).filter(Boolean))).sort()],[productos])

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
    <style>{`
      @keyframes pop{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
      *{box-sizing:border-box}
      body{margin:0;font-family:'Barlow',sans-serif;background:#f0f0ee}
      input,button,select{font-family:inherit}
      ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}
      .dm-header{background:#fff;border-bottom:3px solid #f15922;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 20px rgba(0,0,0,0.07)}
      .dm-logo{height:40px;width:auto}
      .dm-title{font-family:'Barlow Condensed',sans-serif;font-size:clamp(18px,4vw,32px);font-weight:900;color:#f15922;letter-spacing:2px;text-transform:uppercase;line-height:1;text-align:center}
      .dm-sub{font-size:10px;color:#aaa;letter-spacing:.5px;font-weight:500;text-transform:uppercase;margin-top:3px;text-align:center}
      .dm-urg-box{background:#fff5f5;border:1.5px solid #ffd0ce;border-radius:10px;padding:6px 14px;text-align:center;flex-shrink:0}
      .dm-urg-n{font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:900;color:#e53935;line-height:1}
      .dm-urg-l{font-size:9px;font-weight:700;color:#e53935;text-transform:uppercase;letter-spacing:.5px}
      .dm-controls{background:#fff;border-bottom:1px solid #e4e4e2;padding:8px 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .dm-search{padding:7px 12px;border:1.5px solid #e4e4e2;border-radius:8px;font-size:13px;flex:1;min-width:120px;max-width:280px;background:#f7f7f5;color:#1a1a1a;outline:none}
      .dm-tabs{background:#fff;border-bottom:1px solid #e4e4e2;display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch}
      .dm-tab{padding:10px 14px;border:none;border-bottom:3px solid transparent;background:transparent;font-size:13px;font-weight:500;color:#888;cursor:pointer;white-space:nowrap;transition:all .15s}
      .dm-tab.active{color:#f15922;font-weight:700;border-bottom-color:#f15922}
      @media(max-width:600px){
        .dm-header{padding:10px 14px}
        .dm-logo{height:32px}
        .dm-controls{padding:8px 12px}
        .dm-search{max-width:100%}
      }
    `}</style>

    {/* HEADER */}
    <header className="dm-header">
      <img src={LOGO_B64} alt="Dental Medrano" className="dm-logo"/>
      <div>
        <div className="dm-title">Oportunidades 2026</div>
        <div className="dm-sub">Precios especiales · Stock limitado · Consultar mínimos</div>
      </div>
      <div className="dm-urg-box">
        <div className="dm-urg-n">{urgCount}</div>
        <div className="dm-urg-l">Venc. urgente</div>
      </div>
    </header>

    {/* CONTROLS */}
    <div className="dm-controls">
      <input type="search" className="dm-search" placeholder="🔍 Buscar…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <button onClick={()=>setFilterUrg(v=>!v)}
        style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid',fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0,background:filterUrg?'#e53935':'#fff5f5',borderColor:filterUrg?'#e53935':'#ffd0ce',color:filterUrg?'#fff':'#e53935'}}>
        ⚡ Urgentes
      </button>
      <select value={sortIdx} onChange={e=>setSortIdx(Number(e.target.value))}
        style={{padding:'7px 10px',border:'1.5px solid #e4e4e2',borderRadius:8,fontSize:12,background:'#f7f7f5',color:'#555',cursor:'pointer',outline:'none',flexShrink:0}}>
        {SORTS.map((s,i)=><option key={i} value={i}>{s.label}</option>)}
      </select>
      <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
        <span style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:13,color:'#aaa',fontWeight:600}}>{filtered.length}</span>
        {(['grid','list'] as const).map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{width:32,height:32,borderRadius:7,border:'1.5px solid',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,background:view===v?'#f15922':'#f7f7f5',borderColor:view===v?'#f15922':'#e4e4e2',color:view===v?'#fff':'#888'}}>
            {v==='grid'?'⊞':'☰'}
          </button>
        ))}
      </div>
    </div>

    {/* CATEGORY TABS */}
    <div className="dm-tabs">
      {cats.map(c=>(
        <button key={c} className={`dm-tab${cat===c?' active':''}`} onClick={()=>setCat(c)}>{c}</button>
      ))}
    </div>

    {/* PRODUCTS */}
    <div style={{maxWidth:1700,margin:'16px auto 60px',padding:'0 12px',...(view==='grid'?{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}:{display:'flex',flexDirection:'column',gap:8})}}>
      {filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:80,color:'#bbb',fontSize:16}}>No se encontraron productos</div>}
      {filtered.map(p=>view==='grid'
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
