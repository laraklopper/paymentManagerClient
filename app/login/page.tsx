// app/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'
import { Eye, EyeOff } from 'lucide-react';
//Login Page component
export default function LoginPage() {
  const router = useRouter()
  // ---------STATE VARIABLES--------------
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // FIX: wrap in try/catch so a network failure doesn't leave loading=true forever.
    // FIX: finally block ensures setLoading(false) always runs, even on success path
    //      (router.push is async so we must reset before navigating).
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        router.push('/dashboard/payments')
      } else {
        const data = await res.json()
        setError(data.error ?? 'Login failed')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  //=================JSX==============================
  
  return (
    <div className={styles.loginContainer} role='main'>
      <div className={styles.loginBox}>
        <h1 className={styles.formHeading}>Klopper Admin</h1>

        <p className={styles.subtitle}>Sign in to continue</p>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.inputBox}>
            {/* FIX: added htmlFor + id so clicking the label focuses the input */}
            <label htmlFor="email" className={styles.loginLabel}>Email:</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={styles.loginInput}
              placeholder="you@klopper.co.za"
            />
          </div>
          <div className={styles.inputBox}>
            {/* FIX: added htmlFor + id so clicking the label focuses the input */}
            <label htmlFor="password" className={styles.loginLabel}>Password:</label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder='PASSWORD'
              autoComplete="current-password"
              className={styles.loginInput}
            />
          </div>
          <div className={styles.inputBox}>
            <button
              className={styles.showPasswordBtn}
              type='button'
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <>
                  HIDE PASSWORD
                  <EyeOff
                    className={styles.showPswdIcon}
                  />
                </>
              ) : (
                <>
                  SHOW PASSWORD
                  <Eye
                    className={styles.showPswdIcon}
                  />
                </>
              )}
            </button>
          </div>
          {error && <p className={styles.errorMsg}>{error}</p>}
            <div className={styles.btnBlock}>
            <button
              type="submit"
              disabled={loading}
              className={styles.loginBtn}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            </div>
         
        </form>
      </div>
    </div>
  )
}