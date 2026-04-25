'use client'
import { useState, useMemo } from 'react'
import { Producto } from '@/lib/supabase'
import { LOGO_B64 } from '@/lib/logo'
import styles from './landing.module.css'

const MONTHS = ['','01','02','03','04','05','06','07','08','09','10','11','12']
const IMG_YEARS = ['2025','2026','2024']
const IMG_MONTHS = ['12','11','10','09','05','04','03','02','01']

function guessImgUrls(cod: string): string[] {
  const base = cod.split('-')[0].replace(/^0+/, '') || '0'
  const urls: string[] = []
  for (const y of IMG_YEARS) {
    for (const m of IMG_MONTHS) {
      urls.push(`https://dentalmedrano.com/wp-content/uploads/${y}/${m}/${base}-500x500.jpg`)
    }
  }
  return urls
}

function fmt(n: number) {
  return '$ ' + Math.round(n).toLocaleString('es-AR')
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function ProductImg({ producto }: { producto: Producto }) {
  const urls = useMemo(() => {
    if (producto.imagen_url) return [producto.imagen_url, ...guessImgUrls(producto.id)]
    return guessImgUrls(producto.id)
  }, [producto.id, producto.imagen_url])

  const [idx, setIdx] = useState(0)
  const [failed, setFailed] = useState(false)

  if (failed) return <NoImg />

  return (
    <img
      src={urls[idx]}
      alt={producto.nombre}
      className={styles.cardImg}
      onError={() => {
        if (idx + 1 < urls.length) setIdx(i => i + 1)
        else setFailed(true)
      }}
    />
  )
}

function NoImg() {
  return (
    <div className={styles.noImg}>
      <svg viewBox="0 0 40 40" fill="none" stroke="#999" strokeWidth="1.3">
        <rect x="4" y="4" width="32" height="32" rx="4"/>
        <circle cx="15" cy="15" r="4"/>
        <path d="m4 26 9-9 7 7 5-5 11 11"/>
      </svg>
      <span>sin imagen</span>
    </div>
  )
}

function Modal({ producto, onClose }: { producto: Producto; onClose: () => void }) {
  const desc = Math.round((1 - producto.precio_outlet / producto.precio_publico) * 100)
  const fecha = fmtDate(producto.fecha_venc)

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <button className={styles.modalX} onClick={onClose}>✕</button>
        <div className={styles.modalImgArea}>
          <ProductImg producto={producto} />
        </div>
        <div className={styles.modalBody}>
          {producto.es_urgente && <div className={styles.mUrg}>Vencimiento urgente</div>}
          <div className={styles.mCod}>{producto.id}</div>
          <div className={styles.mName}>{producto.nombre}</div>
          <div className={styles.mPricebox}>
            <div className={styles.mPlbl}>Precio Outlet (c/IVA)</div>
            <div className={styles.mPval}>{fmt(producto.precio_outlet)}</div>
            <div className={styles.mPpub}>
              Precio público: <s>{fmt(producto.precio_publico)}</s> · Ahorrás {desc}%
            </div>
          </div>
          <div className={styles.mGrid}>
            <div className={styles.mCell}>
              <div className={styles.mClbl}>Vencimiento</div>
              <div className={`${styles.mCval} ${producto.es_urgente ? styles.red : ''}`}>{fecha}</div>
            </div>
            <div className={styles.mCell}>
              <div className={styles.mClbl}>Stock disponible</div>
              <div className={styles.mCval}>{producto.stock} u.</div>
            </div>
          </div>
          <div className={styles.mLote}>Lote: {producto.lote}</div>
        </div>
      </div>
    </div>
  )
}

export default function LandingClient({ productos }: { productos: Producto[] }) {
  const [filter, setFilter] = useState<'all' | 'urgente'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Producto | null>(null)

  const filtered = useMemo(() => {
    return productos.filter(p => {
      if (filter === 'urgente' && !p.es_urgente) return false
      if (search) {
        const q = search.toLowerCase()
        if (!p.nombre.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [productos, filter, search])

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img src={LOGO_B64} alt="Dental Medrano" className={styles.logo} />
          <div className={styles.divider} />
          <div>
            <div className={styles.title}>Oportunidades 2026</div>
            <div className={styles.sub}>Precios especiales · Stock limitado · Consultar mínimos</div>
          </div>
        </div>
      </header>

      <div className={styles.controls}>
        <input
          className={styles.search}
          type="search"
          placeholder="Buscar por nombre o código…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          className={`${styles.fbtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >Todos</button>
        <button
          className={`${styles.fbtn} ${styles.red} ${filter === 'urgente' ? styles.activeRed : ''}`}
          onClick={() => setFilter('urgente')}
        >🔴 Venc. urgente</button>
        <div className={styles.spacer} />
        <div className={styles.counter}>{filtered.length} productos</div>
      </div>

      <div className={styles.grid}>
        {filtered.length === 0 && (
          <div className={styles.empty}>No se encontraron productos</div>
        )}
        {filtered.map(p => (
          <div
            key={p.id + p.lote}
            className={`${styles.card} ${p.es_urgente ? styles.rojo : ''}`}
            onClick={() => setSelected(p)}
          >
            {p.es_urgente && <div className={styles.badge}>⚡ Urgente</div>}
            <div className={styles.cardImgWrap}>
              <ProductImg producto={p} />
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardCod}>{p.id}</div>
              <div className={styles.cardName}>{p.nombre}</div>
              <div className={styles.priceWrap}>
                <div className={styles.priceLbl}>Precio Outlet</div>
                <div className={styles.priceOut}>{fmt(p.precio_outlet)}</div>
                <div className={styles.pricePub}>Público: {fmt(p.precio_publico)}</div>
              </div>
              <div className={styles.tags}>
                <div className={`${styles.tag} ${p.es_urgente ? styles.tagUrg : ''}`}>
                  Vence {fmtDate(p.fecha_venc)}
                </div>
                <div className={styles.tag}>Stock: {p.stock}</div>
              </div>
              <div className={styles.cardLote}>Lote: {p.lote}</div>
            </div>
          </div>
        ))}
      </div>

      <footer className={styles.footer}>
        <strong>Dental Medrano</strong> · <a href="https://dentalmedrano.com" target="_blank" rel="noreferrer">dentalmedrano.com</a>
        <div className={styles.nota}>Pedido aparte, especificar oportunidades. El mínimo de unidades correspondiente a cada artículo es el que está en la lista 1.</div>
      </footer>

      {selected && <Modal producto={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
