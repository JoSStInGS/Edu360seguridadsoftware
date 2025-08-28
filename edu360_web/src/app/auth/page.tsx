'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/auth/hooks/useAuth'
import {
  signInWithMicrosoft,
  signInWithGoogle,
  signInWithEmail,
} from '@/app/auth/services/auth'

export default function LoginPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingMicrosoft, setLoadingMicrosoft] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  useEffect(() => {
    if (user) {
      router.replace('/welcome')
    }
  }, [user, router])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingEmail(true)
    try {
      await signInWithEmail(email, password)
      router.push('/welcome')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      alert(message)
    } finally {
      setLoadingEmail(false)
    }
  }

  const handleMicrosoftLogin = async () => {
    setLoadingMicrosoft(true)
    try {
      const u = await signInWithMicrosoft()
      if (u) {
        router.push('/welcome')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión con Microsoft'
      alert(message)
    } finally {
      setLoadingMicrosoft(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true)
    try {
      const u = await signInWithGoogle()
      if (u) {
        router.push('/welcome')
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
        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div>
            <label className="sr-only" htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              className="w-full px-4 py-3 bg-transparent border-b-2 border-[var(--text-color)] text-[var(--text-color)] placeholder:text-[var(--placeholder-color)] focus:outline-none focus:border-[var(--button-bg)] transition-colors"
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-4 py-3 bg-transparent border-b-2 border-[var(--text-color)] text-[var(--text-color)] placeholder:text-[var(--placeholder-color)] focus:outline-none focus:border-[var(--button-bg)] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loadingEmail}
            className="w-full bg-[var(--button-bg)] text-[var(--button-text)] font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-60"
          >
            {loadingEmail ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
        <div className="mt-6 flex flex-col gap-4">
          <button
            onClick={handleMicrosoftLogin}
            disabled={loadingMicrosoft}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 disabled:opacity-60"
          >
            {loadingMicrosoft ? 'Cargando...' : (
              <span className="flex items-center gap-2 text-sm font-medium">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.5 22.5H2.5V13.5H11.5V22.5ZM21.5 11.5H12.5V2.5H21.5V11.5ZM11.5 11.5H2.5V2.5H11.5V11.5ZM21.5 22.5H12.5V13.5H21.5V22.5Z" />
                </svg>
                Iniciar con Microsoft
              </span>
            )}
          </button>
          <button
            onClick={handleGoogleLogin}
            disabled={loadingGoogle}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 disabled:opacity-60"
          >
            {loadingGoogle ? 'Cargando...' : (
              <span className="flex items-center gap-2 text-sm font-medium">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
                Iniciar con Google
              </span>
            )}
          </button>
        </div>
        <div className="mt-6 text-center">
          <Link href="/register" className="text-sm text-[var(--link-color)] hover:text-[var(--text-color)]">
            ¿No tienes una cuenta? Crear una
          </Link>
        </div>
      </div>
    </div>
  )
}
