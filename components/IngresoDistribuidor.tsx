'use client'
import { useState } from 'react'
import { LOGO_B64 } from '@/lib/logo'

/** Pantalla de ingreso: el distribuidor entra con su CUIT (con o sin guiones). */
export default function IngresoDistribuidor({ onIngreso }: { onIngreso: () => void }) {
  const [valor, setValor] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function ingresar(e?: React.FormEvent) {
    e?.preventDefault()
    if (!valor.trim() || enviando) return
    setEnviando(true); setError('')
    try {
      const res = await fetch('/api/cliente/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador: valor }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok && j.ok) { onIngreso(); return }
      setError(j.error || 'No pudimos validar el acceso. Probá de nuevo.')
    } catch {
      setError('Sin conexión. Probá de nuevo.')
    }
    setEnviando(false)
  }

  return (
    <div className="ing-wrap">
      <style>{`
        .ing-wrap{min-height:100vh;background:#f0f0ee;font-family:Barlow,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 16px;box-sizing:border-box}
        .ing-card{background:#fff;border-radius:18px;padding:36px 32px 30px;max-width:420px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.09);text-align:center;box-sizing:border-box;border-top:4px solid #f15922}
        .ing-logo{height:46px;margin-bottom:22px}
        .ing-title{font-family:'Barlow Condensed',sans-serif;font-weight:900;color:#f15922;text-transform:uppercase;letter-spacing:2px;font-size:30px;line-height:1.02;margin:0 0 14px}
        .ing-sub{font-size:14px;color:#555;line-height:1.55;margin:0 0 22px}
        .ing-input{width:100%;box-sizing:border-box;padding:13px 14px;border:1.5px solid #e4e4e2;border-radius:10px;font-size:15px;outline:none;background:#f7f7f5;color:#1a1a1a;font-family:inherit;transition:border-color .15s}
        .ing-input:focus{border-color:#f15922;background:#fff}
        .ing-btn{width:100%;margin-top:12px;padding:13px;border:none;border-radius:10px;background:#f15922;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit}
        .ing-btn:disabled{opacity:.6;cursor:wait}
        .ing-err{margin-top:12px;font-size:13px;color:#c62828;font-weight:600;line-height:1.4;background:#fff5f5;border-radius:8px;padding:9px 12px}
        .ing-foot{margin-top:18px;font-size:12px;color:#999;line-height:1.5}
        @media(max-width:420px){.ing-card{padding:28px 20px 24px}.ing-title{font-size:26px;letter-spacing:1.5px}}
      `}</style>
      <form className="ing-card" onSubmit={ingresar}>
        <img src={LOGO_B64} alt="Dental Medrano" className="ing-logo" />
        <h1 className="ing-title">Oportunidades<br />mayoristas 2026</h1>
        <p className="ing-sub">Acceso exclusivo para distribuidores.<br />Ingresá con el CUIT de tu empresa.</p>
        <input
          className="ing-input" value={valor} onChange={e => setValor(e.target.value)}
          placeholder="CUIT (ej: 30-71005390-8)" autoFocus autoComplete="off" inputMode="numeric" aria-label="CUIT"
        />
        <button className="ing-btn" type="submit" disabled={enviando || !valor.trim()}>
          {enviando ? 'Verificando…' : 'Ingresar'}
        </button>
        {error && <div className="ing-err">{error}</div>}
        <div className="ing-foot">¿No tenés acceso? Consultá con tu vendedor de Dental Medrano.</div>
      </form>
      <div style={{ marginTop: 24, fontSize: 11, color: '#bbb' }}>© Dental Medrano 2026</div>
    </div>
  )
}
