'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { registerWithEmail } from '@/app/auth/services/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const requirements: string[] = []
    if (password.length < 9) requirements.push('La contraseña debe tener al menos 9 caracteres')
    if (!/[A-Z]/.test(password)) requirements.push('Falta una letra mayúscula')
    if (!/[a-z]/.test(password)) requirements.push('Falta una letra minúscula')
    if (!/\d/.test(password)) requirements.push('Falta un número')

    if (requirements.length > 0) {
      setError(requirements.join('. '))
      setLoading(false)
      return
    }

    try {
      await registerWithEmail(email, password)
      router.push('/auth/complete-profile')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la cuenta'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[var(--bg-color)] flex items-center justify-center min-h-screen p-4">
      <div className="bg-[var(--container-bg)] rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--text-color)]">Crear cuenta</h1>
        </div>
        <form onSubmit={handleRegister} className="space-y-6">
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
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--button-bg)] text-[var(--button-text)] font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-60"
          >
            {loading ? 'Creando...' : 'Crear cuenta'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link href="/auth" className="text-sm text-[var(--link-color)] hover:text-[var(--text-color)]">
            ¿Ya tienes una cuenta? Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
