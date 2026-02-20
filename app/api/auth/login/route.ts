// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth'

export async function POST(request: Request) {
  // FIX: request.json() throws on malformed JSON — catch it and return 400
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // FIX: validate that email and password are present strings before using them.
  // Without this, bcrypt.compare(undefined, hash) throws an unhandled error.
  const { email, password } = body as Record<string, unknown>
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const rickyEmail = process.env.RICKY_EMAIL
  const rickyHash = process.env.RICKY_PASSWORD_HASH
  const laraEmail = process.env.LARA_EMAIL
  const laraHash = process.env.LARA_PASSWORD_HASH

  let role: 'admin' | 'loader' | null = null
  let validHash: string | null = null

  if (email === rickyEmail && rickyHash) {
    role = 'admin'
    validHash = rickyHash
  } else if (email === laraEmail && laraHash) {
    role = 'loader'
    validHash = laraHash
  }

  if (!role || !validHash || !(await bcrypt.compare(password, validHash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  // FIX: signToken() throws if JWT_SECRET is missing or malformed — catch it and
  // return 500 with a useful message instead of an unhandled server crash.
  let token: string
  try {
    token = await signToken({ email, role })
  } catch {
    return NextResponse.json({ error: 'Authentication configuration error' }, { status: 500 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return response
}
