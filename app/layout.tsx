import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Oportunidades 2026 — Dental Medrano',
  description: 'Precios especiales en productos seleccionados. Stock limitado.',
  icons: { icon: '/favicon-32.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon-32.png" type="image/png" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
