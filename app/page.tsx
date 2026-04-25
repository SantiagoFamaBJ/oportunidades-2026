'use client'
import { useEffect, useState } from 'react'
import { supabase, Producto } from '@/lib/supabase'
import LandingClient from '@/components/LandingClient'

export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('productos_oportunidades')
      .select('*')
      .eq('activo', true)
      .order('fecha_venc', { ascending: true })
      .then(({ data }) => {
        setProductos((data || []) as Producto[])
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f0f0ee',
      fontFamily: 'Barlow, sans-serif', fontSize: 16, color: '#aaa'
    }}>
      Cargando productos...
    </div>
  )

  return <LandingClient productos={productos} />
}
