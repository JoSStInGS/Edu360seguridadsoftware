'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/auth/hooks/useAuth'
import { createClient } from '@/app/lib/supabase/client'
import { getUserRole, isMepEmail } from '@/app/auth/services/auth'
import {
  resendSignUpConfirmation,
  signInWithGoogle,
  signInWithEmail,
} from '@/app/auth/services/auth'

import { GoogleButton } from '@/app/auth/components/SocialButtons'
import { Input } from '@/app/components/Input'
import { Button } from '@/app/components/Button'

type PendingRegistration = {
  role: 'admin' | 'professor' | 'parent';
  activationCode: string;
  selectedCenterId: string;
  email: string;
}

const supabase = createClient()
const PENDING_REGISTRATION_KEY = 'edu360_pending_registration'

export default function LoginPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const errorCode = hashParams.get('error_code')
    const errorDescription = hashParams.get('error_description')

    if (errorCode === 'otp_expired') {
      setAuthError('El enlace de confirmación expiró o ya fue usado. Reenvía el correo de confirmación e intenta de nuevo.')
      window.history.replaceState(null, '', '/auth')
    } else if (errorDescription) {
      setAuthError(errorDescription.replace(/\+/g, ' '))
      window.history.replaceState(null, '', '/auth')
    }
  }, [])

  const completePendingRegistration = async (userEmail?: string | null) => {
    const pending = localStorage.getItem(PENDING_REGISTRATION_KEY)
    if (!pending) return

    const data = JSON.parse(pending) as PendingRegistration
    if (userEmail && data.email.trim().toLowerCase() !== userEmail.trim().toLowerCase()) {
      localStorage.removeItem(PENDING_REGISTRATION_KEY)
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const response = await fetch('/api/registration/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        center: data.selectedCenterId,
        code: data.activationCode,
        role: data.role,
        mepEmail: isMepEmail(data.email, [data.role]) ? data.email.trim().toLowerCase() : null,
      }),
    })

    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error ?? 'No se pudo completar el registro')

    localStorage.removeItem(PENDING_REGISTRATION_KEY)
  }

  useEffect(() => {
    let active = true
    const check = async () => {
      if (user) {
        if (loadingEmail || loadingGoogle) return

        const role = await getUserRole(user.id)
        if (!active) return

        if (role) {
          localStorage.removeItem(PENDING_REGISTRATION_KEY)
          router.replace('/welcome')
        } else {
          await completePendingRegistration(user.email)
          router.replace('/auth/complete-profile')
        }
      }
    }
    void check()
    return () => { active = false }
  }, [user, router, loadingEmail, loadingGoogle])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingEmail(true)
    setAuthError(null)
    setAuthNotice(null)
    try {
      const u = await signInWithEmail(email, password)
      const role = await getUserRole(u.id)
      if (role) {
        localStorage.removeItem(PENDING_REGISTRATION_KEY)
        router.push('/welcome')
        return
      }

      await completePendingRegistration(u.email)
      const updatedRole = await getUserRole(u.id)
      router.push(updatedRole ? '/welcome' : '/auth/complete-profile')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setAuthError(message)
    } finally {
      setLoadingEmail(false)
    }
  }

  const handleResendConfirmation = async () => {
    setResendingConfirmation(true)
    setAuthError(null)
    setAuthNotice(null)
    try {
      await resendSignUpConfirmation(email)
      setAuthNotice('Te enviamos un nuevo correo de confirmación. Ábrelo desde este mismo navegador si puedes.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo reenviar el correo de confirmación'
      setAuthError(message)
    } finally {
      setResendingConfirmation(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true)
    try {
      const u = await signInWithGoogle()
      if (u) {
        const role = await getUserRole(u.id)
        router.push(role ? '/welcome' : '/auth/complete-profile')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión con Google'
      alert(message)
    } finally {
      setLoadingGoogle(false)
    }
  }

  return (
    <div className="bg-[var(--bg-color)] flex items-center justify-center min-h-screen p-4">
      <div className="bg-[var(--container-bg)] rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--text-color)]">Edu360</h1>
          <p className="text-[var(--text-color)] mt-2">Bienvenido de nuevo</p>
        </div>
        {authError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {authError}
            {authError.includes('confirmación') && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendingConfirmation}
                className="mt-3 block font-semibold text-[var(--link-color)] underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendingConfirmation ? 'Reenviando...' : 'Reenviar correo de confirmación'}
              </button>
            )}
          </div>
        )}
        {authNotice && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
            {authNotice}
          </div>
        )}
        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div>
            <label className="sr-only" htmlFor="email">Correo electrónico</label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="password">Contraseña</label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
            />
          </div>
          <Button
            type="submit"
            loading={loadingEmail}
            loadingText="Ingresando..."
          >
            Iniciar sesión
          </Button>
        </form>
        <div className="mt-6 flex flex-col gap-4">
          <GoogleButton
            onClick={handleGoogleLogin}
            loading={loadingGoogle}
          />
        </div>
        <div className="mt-6 text-center">
          <Link href="/auth/complete-profile" className="text-sm text-[var(--link-color)] hover:text-[var(--text-color)]">
            ¿No tienes una cuenta? Crear una
          </Link>
        </div>
      </div>
    </div>
  )
}
