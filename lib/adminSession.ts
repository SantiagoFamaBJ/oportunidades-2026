import { createHmac, timingSafeEqual } from 'crypto'

const COOKIE_NAME = 'dm_admin_session'
const SESSION_MS = 8 * 60 * 60 * 1000 // 8 horas

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s) throw new Error('ADMIN_SESSION_SECRET no configurada')
  return s
}

export function createToken(): string {
  const secret = getSecret()
  const payload = Buffer.from(JSON.stringify({ ts: Date.now() })).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false
  let secret: string
  try { secret = getSecret() } catch { return false }

  const dot = token.lastIndexOf('.')
  if (dot === -1) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url')
  try {
    const a = Buffer.from(sig, 'base64url')
    const b = Buffer.from(expectedSig, 'base64url')
    if (a.length !== b.length) return false
    if (!timingSafeEqual(a, b)) return false
  } catch { return false }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof data.ts === 'number' && Date.now() - data.ts < SESSION_MS
  } catch { return false }
}

export { COOKIE_NAME }

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_MS / 1000,
  }
}
