'use client'
import { useState, useMemo } from 'react'
import { Producto } from '@/lib/supabase'
import { LOGO_B64 } from '@/lib/logo'

const fmt = (n: number) => '$\u00a0' + Math.round(n).toLocaleString('es-AR')
const fmtDate = (iso: string) => { const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}` }
const pct = (pub: number, out: number) => Math.round((1 - out / pub) * 100)
const WA_NUMBER = '5491164294000'

const STORAGE_BASE = 'https://larqxmgyutqiktsforgz.supabase.co/storage/v1/object/public/product-images'
const BUST = new Date().toISOString().slice(0, 10)

function getUrls(p: Producto): string[] {
  const id = p.id; const baseId = p.codigo
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

type CartItem = { producto: Producto; qty: number }

/* ── CARRITO ── */
function Cart({ items, onClose, onRemove, onQty }: {
  items: CartItem[]
  onClose: () => void
  onRemove: (id: string) => void
  onQty: (id: string, qty: number) => void
}) {
  function sendWA() {
    if (items.length === 0) return
    const lines = items.map(i => {
      const subtotal = Math.round(i.producto.precio_outlet * i.qty)
      return `• ${i.producto.nombre} - Lote: ${i.producto.lote} - Cant: ${i.qty} - $\u00a0${subtotal.toLocaleString('es-AR')}`
    }).join('\n')
    const total = items.reduce((sum, i) => sum + Math.round(i.producto.precio_outlet * i.qty), 0)
    const msg = `¡Hola! Me gustaría consultar por las siguientes oportunidades:\n\n${lines}\n\nTotal aprox: $\u00a0${total.toLocaleString('es-AR')}\n\nAguardo respuesta. Saludos.`
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:400,display:'flex',alignItems:'flex-end',justifyContent:'flex-end',padding:20,backdropFilter:'blur(4px)'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:420,maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)',animation:'pop .2s cubic-bezier(.34,1.56,.64,1)'}}>
        {/* Header */}
        <div style={{padding:'16px 20px',borderBottom:'1px solid #e4e4e2',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:18,fontWeight:800,color:'#1a1a1a'}}>
            🛒 Mi pedido <span style={{color:'#aaa',fontWeight:500,fontSize:14}}>({items.length} producto{items.length!==1?'s':''})</span>
          </div>
          <button onClick={onClose} style={{background:'rgba(0,0,0,0.07)',border:'none',width:28,height:28,borderRadius:'50%',fontSize:14,cursor:'pointer',color:'#888',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        {/* Items */}
        <div style={{overflowY:'auto',flex:1,padding:'8px 0'}}>
          {items.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 20px',color:'#bbb',fontSize:14}}>
              No hay productos en el pedido
            </div>
          ) : items.map(({producto:p, qty}) => (
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderBottom:'1px solid #f5f5f5'}}>
              <div style={{width:48,height:48,flexShrink:0,background:'#f5f5f3',borderRadius:8,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Img p={p} h={48}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,lineHeight:1.3,color:'#1a1a1a',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.nombre}</div>
                <div style={{fontSize:11,color:'#f15922',fontWeight:700,marginTop:2}}>{fmt(p.precio_outlet)}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                <button onClick={()=>onQty(p.id, qty-1)}
                  style={{width:26,height:26,borderRadius:6,border:'1.5px solid #e4e4e2',background:'#f7f7f5',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',color:'#555'}}>−</button>
                <span style={{fontSize:14,fontWeight:700,minWidth:20,textAlign:'center'}}>{qty}</span>
                <button onClick={()=>onQty(p.id, qty+1)}
                  style={{width:26,height:26,borderRadius:6,border:'1.5px solid #e4e4e2',background:'#f7f7f5',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',color:'#555'}}>+</button>
                <button onClick={()=>onRemove(p.id)}
                  style={{width:26,height:26,borderRadius:6,border:'1px solid #ffd0ce',background:'#fff5f5',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',color:'#e53935'}}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{padding:'14px 16px',borderTop:'1px solid #e4e4e2',flexShrink:0}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:13,color:'#888',fontWeight:600}}>Total aprox.</span>
              <span style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:22,fontWeight:900,color:'#f15922'}}>
                {fmt(items.reduce((sum,i)=>sum+Math.round(i.producto.precio_outlet*i.qty),0))}
              </span>
            </div>
            <button onClick={sendWA} style={{
              width:'100%',padding:'13px',background:'#25D366',color:'#fff',
              border:'none',borderRadius:10,fontSize:15,fontWeight:800,
              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,
              fontFamily:'Barlow,sans-serif',letterSpacing:.3
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Enviar consulta por WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── MODAL PRODUCTO ── */
function Modal({p, onClose, onAdd}:{p:Producto;onClose:()=>void;onAdd:(p:Producto)=>void}) {
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
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
            {[{l:'Vencimiento',v:fmtDate(p.fecha_venc),r:p.es_urgente},{l:'Stock',v:`${p.stock} u.`,r:false},{l:'Lote',v:p.lote,r:false}].map(({l,v,r})=>(
              <div key={l} style={{background:'#f7f7f5',borderRadius:8,padding:'10px',border:'1px solid #e4e4e2'}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#bbb',marginBottom:4}}>{l}</div>
                <div style={{fontSize:12,fontWeight:700,color:r?'#e53935':'#1a1a1a',wordBreak:'break-all'}}>{v}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>{onAdd(p);onClose()}} style={{
            width:'100%',padding:'12px',background:'#f15922',color:'#fff',
            border:'none',borderRadius:10,fontSize:14,fontWeight:800,
            cursor:'pointer',fontFamily:'Barlow,sans-serif',letterSpacing:.3
          }}>
            + Agregar al pedido
          </button>
          <div style={{fontSize:11,color:'#aaa',textAlign:'center',padding:'12px 0 0',borderTop:'1px solid #e4e4e2',marginTop:12}}>Pedido aparte · especificar oportunidades · consultar mínimos</div>
        </div>
      </div>
    </div>
  )
}

/* ── CARD GRID ── */
function CardGrid({p,onClick,onAdd,inCart}:{p:Producto;onClick:()=>void;onAdd:(p:Producto)=>void;inCart:boolean}) {
  const d = pct(p.precio_publico, p.precio_outlet)
  const [hov,setHov] = useState(false)
  const shadow = hov
    ? (p.es_urgente?'0 0 0 2px #e53935,0 0 24px 5px rgba(229,57,53,.22),0 8px 20px rgba(0,0,0,.10)':'0 0 0 2px #f15922,0 0 20px 4px rgba(241,89,34,.20),0 8px 20px rgba(0,0,0,.10)')
    : (p.es_urgente?'0 0 0 1px #ffd0ce,0 0 16px 3px rgba(229,57,53,.18),0 3px 10px rgba(0,0,0,.05)':'0 2px 8px rgba(0,0,0,.05)')
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:'#fff',borderRadius:12,border:p.es_urgente?'2px solid #ffd0ce':'1.5px solid #e4e4e2',display:'flex',flexDirection:'column',cursor:'pointer',position:'relative',overflow:'hidden',transition:'transform .18s,box-shadow .18s',transform:hov?'translateY(-4px)':'none',boxShadow:shadow}}>
      {p.es_urgente&&<div style={{position:'absolute',top:8,left:8,zIndex:2,background:'#e53935',color:'#fff',fontFamily:'Barlow Condensed,sans-serif',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:4,letterSpacing:1,textTransform:'uppercase'}}>⚡ Urgente</div>}
      <div onClick={onClick} style={{height:120,background:p.es_urgente?'#fff8f7':'#f7f7f5',borderBottom:'1px solid #e4e4e2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
        <Img p={p} h={120}/>
      </div>
      <div style={{padding:'10px 12px 12px',display:'flex',flexDirection:'column',gap:6,flex:1}}>
        <div onClick={onClick}>
          <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:10,fontWeight:700,color:'#ccc',letterSpacing:1.2,textTransform:'uppercase'}}>{p.codigo}</div>
          <div style={{fontSize:12,fontWeight:600,lineHeight:1.4,color:'#1a1a1a',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden',minHeight:50}}>{p.nombre}</div>
          <div style={{marginTop:6,paddingTop:6,borderTop:'1px solid #f0f0ee'}}>
            <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#f15922',marginBottom:2}}>Precio Outlet</div>
            <div style={{display:'flex',alignItems:'baseline',gap:6}}>
              <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:24,fontWeight:900,color:'#f15922',lineHeight:1,letterSpacing:-0.5}}>{fmt(p.precio_outlet)}</div>
              <div style={{background:d>=60?'#e53935':d>=40?'#f15922':'#555',color:'#fff',fontFamily:'Barlow Condensed,sans-serif',fontSize:14,fontWeight:900,padding:'2px 6px',borderRadius:4,lineHeight:1}}>−{d}%</div>
            </div>
            <div style={{fontSize:11,color:'#ccc',textDecoration:'line-through',marginTop:2}}>{fmt(p.precio_publico)}</div>
          </div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:4}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:600,color:p.es_urgente?'#e53935':'#888',background:p.es_urgente?'#fff5f5':'#f5f5f3',padding:'3px 7px',borderRadius:4,border:`1px solid ${p.es_urgente?'#ffd0ce':'#e4e4e2'}`}}>🗓 {fmtDate(p.fecha_venc)}</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:600,color:'#888',background:'#f5f5f3',padding:'3px 7px',borderRadius:4,border:'1px solid #e4e4e2'}}>📦 {p.stock}</span>
          </div>
          <div style={{fontSize:9,color:'#ccc',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginTop:2}}>Lote: {p.lote}</div>
        </div>
        <button onClick={e=>{e.stopPropagation();onAdd(p)}} style={{
          width:'100%',padding:'7px',marginTop:2,
          background:inCart?'#e8f5e9':'#f15922',
          color:inCart?'#2e7d32':'#fff',
          border:inCart?'1.5px solid #4caf50':'none',
          borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer',
          fontFamily:'Barlow,sans-serif',transition:'all .15s'
        }}>
          {inCart ? '✓ En el pedido' : '+ Agregar'}
        </button>
      </div>
    </div>
  )
}

/* ── CARD LIST ── */
function CardList({p,onClick,onAdd,inCart}:{p:Producto;onClick:()=>void;onAdd:(p:Producto)=>void;inCart:boolean}) {
  const d = pct(p.precio_publico, p.precio_outlet)
  return (
    <div style={{background:'#fff',borderRadius:10,border:p.es_urgente?'1.5px solid #ffd0ce':'1.5px solid #e4e4e2',display:'grid',gridTemplateColumns:'64px 1fr auto',alignItems:'center',gap:12,padding:'10px 14px',boxShadow:p.es_urgente?'0 0 12px 2px rgba(229,57,53,.12)':'0 2px 6px rgba(0,0,0,.04)'}}>
      <div onClick={onClick} style={{width:64,height:64,flexShrink:0,background:'#f5f5f3',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',cursor:'pointer'}}>
        <Img p={p} h={64}/>
      </div>
      <div onClick={onClick} style={{minWidth:0,cursor:'pointer'}}>
        <div style={{fontSize:10,color:'#ccc',fontFamily:'Barlow Condensed,sans-serif',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:2}}>{p.codigo}</div>
        <div style={{fontSize:13,fontWeight:600,lineHeight:1.3,color:'#1a1a1a',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{p.nombre}</div>
        <div style={{fontSize:11,color:'#bbb',marginTop:3}}>Lote: {p.lote} · {fmtDate(p.fecha_venc)}</div>
      </div>
      <div style={{textAlign:'right',flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
        <div>
          <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#f15922',marginBottom:2}}>Outlet</div>
          <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:20,fontWeight:900,color:'#f15922',lineHeight:1}}>{fmt(p.precio_outlet)}</div>
          <div style={{display:'flex',alignItems:'center',gap:5,justifyContent:'flex-end',marginTop:2}}>
            <span style={{fontSize:10,color:'#ccc',textDecoration:'line-through'}}>{fmt(p.precio_publico)}</span>
            <span style={{background:'#e53935',color:'#fff',fontSize:10,fontWeight:800,padding:'1px 5px',borderRadius:3,fontFamily:'Barlow Condensed,sans-serif'}}>−{d}%</span>
          </div>
        </div>
        <button onClick={e=>{e.stopPropagation();onAdd(p)}} style={{
          padding:'6px 10px',
          background:inCart?'#e8f5e9':'#f15922',
          color:inCart?'#2e7d32':'#fff',
          border:inCart?'1.5px solid #4caf50':'none',
          borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer',
          fontFamily:'Barlow,sans-serif',whiteSpace:'nowrap'
        }}>
          {inCart ? '✓ En pedido' : '+ Agregar'}
        </button>
      </div>
    </div>
  )
}

/* ── MAIN ── */
export default function LandingClient({productos}:{productos:Producto[]}) {
  const [filterUrg,setFilterUrg] = useState(false)
  const [cat,setCat] = useState('Todas')
  const [sortIdx,setSortIdx] = useState(1)
  const [search,setSearch] = useState('')
  const [view,setView] = useState<'grid'|'list'>('grid')
  const [selected,setSelected] = useState<Producto|null>(null)
  const [cart,setCart] = useState<CartItem[]>([])
  const [showCart,setShowCart] = useState(false)

  const cats = useMemo(()=>['Todas',...Array.from(new Set(productos.map(p=>p.categoria).filter(Boolean))).sort()],[productos])

  const filtered = useMemo(()=>{
    let items = productos.filter(p=>{
      if(filterUrg&&!p.es_urgente) return false
      if(cat!=='Todas'&&p.categoria!==cat) return false
      if(search){const q=search.toLowerCase();if(!p.nombre.toLowerCase().includes(q)&&!p.codigo.toLowerCase().includes(q)) return false}
      return true
    })
    return [...items].sort(SORTS[sortIdx].fn)
  },[productos,filterUrg,cat,sortIdx,search])

  function addToCart(p: Producto) {
    setCart(prev => {
      const exists = prev.find(i => i.producto.id === p.id)
      if (exists) return prev.map(i => i.producto.id === p.id ? {...i, qty: i.qty+1} : i)
      return [...prev, {producto: p, qty: 1}]
    })
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(i => i.producto.id !== id))
  }

  function setQty(id: string, qty: number) {
    if (qty <= 0) { removeFromCart(id); return }
    setCart(prev => prev.map(i => i.producto.id === id ? {...i, qty} : i))
  }

  const cartIds = useMemo(() => new Set(cart.map(i => i.producto.id)), [cart])
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  return(<>
    <style>{`
      @keyframes pop{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
      @keyframes cartBounce{0%{transform:scale(1)}50%{transform:scale(1.25)}100%{transform:scale(1)}}
      *{box-sizing:border-box}
      body{margin:0;font-family:'Barlow',sans-serif;background:#f0f0ee}
      input,button,select{font-family:inherit}
      ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}
      .dm-header{background:#fff;border-bottom:3px solid #f15922;padding:14px 32px;display:flex;align-items:center;justify-content:space-between;gap:20px;box-shadow:0 2px 20px rgba(0,0,0,0.07)}
      .dm-logo{height:46px;width:auto;flex-shrink:0}
      .dm-title{font-family:'Barlow Condensed',sans-serif;font-size:clamp(22px,4vw,34px);font-weight:900;color:#f15922;letter-spacing:3px;text-transform:uppercase;line-height:1;text-align:center;flex:1}
      .dm-controls{background:#fff;border-bottom:1px solid #e4e4e2;padding:8px 16px;display:flex;flex-direction:column;gap:8px}
      .dm-controls-row{display:flex;align-items:center;gap:8px;width:100%}
      .dm-search{padding:7px 12px;border:1.5px solid #e4e4e2;border-radius:8px;font-size:13px;flex:1;min-width:0;background:#f7f7f5;color:#1a1a1a;outline:none}
      .dm-tabs{background:#fff;border-bottom:1px solid #e4e4e2;display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch}
      .dm-tab{padding:10px 14px;border:none;border-bottom:3px solid transparent;background:transparent;font-size:13px;font-weight:500;color:#888;cursor:pointer;white-space:nowrap;transition:all .15s}
      .dm-tab.active{color:#f15922;font-weight:700;border-bottom-color:#f15922}
      @media(max-width:600px){
        .dm-header{flex-direction:column;align-items:center;padding:14px 16px;gap:8px}
        .dm-logo{height:38px}
        .dm-title{font-size:28px;letter-spacing:2px}
        .dm-controls{padding:8px 12px}
      }
    `}</style>

    <header className="dm-header">
      <img src={LOGO_B64} alt="Dental Medrano" className="dm-logo"/>
      <div className="dm-title">Oportunidades 2026</div>
    </header>

    <div className="dm-controls">
      <div className="dm-controls-row">
        <input type="search" className="dm-search" placeholder="🔍 Buscar…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <button onClick={()=>setFilterUrg(v=>!v)}
          style={{padding:'7px 12px',borderRadius:8,border:'1.5px solid',fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap',background:filterUrg?'#e53935':'#fff5f5',borderColor:filterUrg?'#e53935':'#ffd0ce',color:filterUrg?'#fff':'#e53935'}}>
          ⚡ Urgentes
        </button>
      </div>
      <div className="dm-controls-row">
        <select value={sortIdx} onChange={e=>setSortIdx(Number(e.target.value))}
          style={{padding:'7px 10px',border:'1.5px solid #e4e4e2',borderRadius:8,fontSize:12,background:'#f7f7f5',color:'#555',cursor:'pointer',outline:'none',flex:1,minWidth:0}}>
          {SORTS.map((s,i)=><option key={i} value={i}>{s.label}</option>)}
        </select>
        <span style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:13,color:'#aaa',fontWeight:600,flexShrink:0}}>{filtered.length}</span>
        {(['grid','list'] as const).map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{width:32,height:32,borderRadius:7,border:'1.5px solid',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0,background:view===v?'#f15922':'#f7f7f5',borderColor:view===v?'#f15922':'#e4e4e2',color:view===v?'#fff':'#888'}}>
            {v==='grid'?'⊞':'☰'}
          </button>
        ))}
      </div>
    </div>

    <div className="dm-tabs">
      {cats.map(c=>(
        <button key={c} className={`dm-tab${cat===c?' active':''}`} onClick={()=>setCat(c)}>{c}</button>
      ))}
    </div>

    <div style={{maxWidth:1700,margin:'16px auto 100px',padding:'0 12px',...(view==='grid'?{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}:{display:'flex',flexDirection:'column',gap:8})}}>
      {filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:80,color:'#bbb',fontSize:16}}>No se encontraron productos</div>}
      {filtered.map(p=>view==='grid'
        ?<CardGrid key={p.id} p={p} onClick={()=>setSelected(p)} onAdd={addToCart} inCart={cartIds.has(p.id)}/>
        :<CardList key={p.id} p={p} onClick={()=>setSelected(p)} onAdd={addToCart} inCart={cartIds.has(p.id)}/>
      )}
    </div>

    <footer style={{background:'#111',color:'#666',textAlign:'center',padding:'24px 20px',fontSize:13}}>
      <strong style={{color:'#fff'}}>Dental Medrano</strong>{' · '}
      <a href="https://dentalmedrano.com" target="_blank" rel="noreferrer" style={{color:'#f15922',textDecoration:'none'}}>dentalmedrano.com</a>
      <div style={{marginTop:8,fontSize:11,color:'#444',maxWidth:540,marginLeft:'auto',marginRight:'auto'}}>
        Pedido aparte, especificar oportunidades. El mínimo de unidades correspondiente a cada artículo es el que está en la lista 1.
      </div>
    </footer>

    {/* Botón flotante carrito */}
    <button onClick={()=>setShowCart(true)} style={{
      position:'fixed',bottom:24,right:24,zIndex:200,
      width:60,height:60,borderRadius:'50%',
      background:'#25D366',color:'#fff',border:'none',
      boxShadow:'0 4px 20px rgba(37,211,102,0.5)',
      cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:26,transition:'transform .15s',
    }}
      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'}
      onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
    >
      🛒
      {cartCount > 0 && (
        <div style={{
          position:'absolute',top:-4,right:-4,
          background:'#f15922',color:'#fff',
          width:22,height:22,borderRadius:'50%',
          fontSize:11,fontWeight:800,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'Barlow Condensed,sans-serif',
          animation: cartCount > 0 ? 'cartBounce .3s ease' : 'none'
        }}>{cartCount}</div>
      )}
    </button>

    {selected && <Modal p={selected} onClose={()=>setSelected(null)} onAdd={addToCart}/>}
    {showCart && <Cart items={cart} onClose={()=>setShowCart(false)} onRemove={removeFromCart} onQty={setQty}/>}
  </>)
}
