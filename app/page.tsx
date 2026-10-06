'use client'
import { useEffect, useState } from 'react'
import { supabase, Producto } from '@/lib/supabase'
import LandingClient from '@/components/LandingClient'

const SUPABASE_URL = 'https://larqxmgyutqiktsforgz.supabase.co'

export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [landingActiva, setLandingActiva] = useState<boolean | null>(null)

  async function fetchAll() {
    // Verificar config
    const { data: config } = await supabase
      .from('oportunidades_config')
      .select('landing_activa')
      .single()
    setLandingActiva(config?.landing_activa ?? true)

    if (config?.landing_activa === false) {
      setLoading(false)
      return
    }

    // Cargar productos
    const { data, error } = await supabase
      .from('productos_oportunidades')
      .select('*')
      .eq('activo', true)
      .order('fecha_venc', { ascending: true })
    if (!error) setProductos((data || []) as Producto[])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // Refrescar cuando la pestaña vuelve a estar activa
  useEffect(() => {
    const onFocus = () => {
      supabase
        .from('oportunidades_config')
        .select('landing_activa')
        .single()
        .then(({ data: config }) => {
          setLandingActiva(config?.landing_activa ?? true)
          if (config?.landing_activa !== false) {
            supabase
              .from('productos_oportunidades')
              .select('*')
              .eq('activo', true)
              .order('fecha_venc', { ascending: true })
              .then(({ data }) => { if (data) setProductos(data as Producto[]) })
          }
        })
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  if (loading || landingActiva === null) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f0f0ee',
      fontFamily: 'Barlow, sans-serif', fontSize: 16, color: '#aaa'
    }}>
      Cargando...
    </div>
  )

  if (!landingActiva) return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f0ee',
      fontFamily: 'Barlow, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      {/* Logo placeholder */}
      <div style={{
        width: 72, height: 72, background: '#f15922', borderRadius: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 900, fontSize: 28,
        fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 1,
        marginBottom: 32,
        boxShadow: '0 8px 32px rgba(241,89,34,0.25)',
      }}>DM</div>

      <div style={{
        background: '#fff',
        borderRadius: 18,
        padding: '40px 36px',
        maxWidth: 460,
        width: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.09)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 2,
          color: '#f15922',
          marginBottom: 16,
        }}>Dental Medrano · Oportunidades</div>

        <div style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 30,
          fontWeight: 900,
          color: '#1a1a1a',
          lineHeight: 1.2,
          marginBottom: 16,
        }}>
          Estamos renovando<br />nuestras oportunidades.
        </div>

        <div style={{
          fontSize: 15,
          color: '#555',
          lineHeight: 1.65,
          marginBottom: 8,
        }}>
          Pronto vas a encontrar los mejores precios en productos odontológicos de primera línea.
        </div>

        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#f15922',
          marginTop: 20,
        }}>
          ¡Gracias por la espera!
        </div>
      </div>

      <div style={{
        marginTop: 28,
        fontSize: 11,
        color: '#bbb',
      }}>
        © Dental Medrano 2026
      </div>
    </div>
  )

  return <LandingClient productos={productos} />
}
