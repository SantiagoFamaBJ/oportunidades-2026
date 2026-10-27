import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, COOKIE_NAME } from '@/lib/adminSession'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'product-images'

export async function POST(req: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!verifyToken(token)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const file = form.get('file') as File | null
  const path = form.get('path') as string | null

  if (!file || !path || typeof path !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Sanitizar el path: solo letras, números, guiones, puntos y barras
  const safePath = path.replace(/[^a-zA-Z0-9\-_.\/]/g, '')
  if (safePath !== path) {
    return NextResponse.json({ ok: false, error: 'Path inválido' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()

  const { error } = await supabaseAdmin()
    .storage
    .from(BUCKET)
    .upload(safePath, bytes, { contentType: file.type, upsert: true })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const { data } = supabaseAdmin().storage.from(BUCKET).getPublicUrl(safePath)
  return NextResponse.json({ ok: true, url: data.publicUrl + '?t=' + Date.now() })
}
