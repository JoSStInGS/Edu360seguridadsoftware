'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/app/lib/firebase'
import { Input } from '@/app/components/Input'
import { Button } from '@/app/components/Button'
import { logout } from '@/app/auth/services/auth'

export default function MepEmailPage() {
  const router = useRouter()
  const [mepEmail, setMepEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = mepEmail.trim().toLowerCase()
    if (!trimmed) {
      setError('Por favor ingresa tu correo MEP.')
      return
    }

    setLoading(true)
    try {
      const user = auth.currentUser
      if (!user) {
        router.replace('/auth')
        return
      }

      const idToken = await user.getIdToken()
      const res = await fetch('/api/users/save-mep-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ mepEmail: trimmed }),
      })

      const data = await res.json() as { error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Error al guardar el correo. Intenta de nuevo.')
        return
      }

      router.replace('/welcome')
    } catch {
      setError('Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.replace('/auth')
  }

  return (
    <div className="bg-[var(--bg-color)] flex items-center justify-center min-h-screen p-4">
      <div className="bg-[var(--container-bg)] rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--border-light)] dark:border-[var(--border-dark)]">

        {/* Header */}
        <div className="flex flex-col items-center text-center w-full mb-8">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[var(--button-bg)] mb-4">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '28px' }}>badge</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-color)] pb-2">Correo institucional MEP</h1>
          <p className="text-[var(--text-color)] opacity-70 text-sm font-normal">
            Para continuar, registra tu correo institucional del MEP.
            Este dato es necesario para funciones del sistema.
          </p>
        </div>

        {/* Info box */}
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 flex gap-3 items-start">
          <span className="material-symbols-outlined text-blue-500 mt-0.5" style={{ fontSize: '20px' }}>info</span>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-semibold mb-1">¿Cuál correo debo ingresar?</p>
            <ul className="list-disc list-inside space-y-1 opacity-90">
              <li>Profesores y administrativos: <span className="font-mono">@mep.go.cr</span></li>
              <li>Padres de familia: <span className="font-mono">@est.mep.go.cr</span></li>
            </ul>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 flex gap-3 items-start">
            <span className="material-symbols-outlined text-red-500 mt-0.5" style={{ fontSize: '20px' }}>error</span>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-color)] mb-2" htmlFor="mep-email">
              Correo MEP
            </label>
            <Input
              id="mep-email"
              type="email"
              required
              value={mepEmail}
              onChange={(e) => setMepEmail(e.target.value)}
              placeholder="usuario@mep.go.cr"
            />
          </div>
          <Button
            type="submit"
            loading={loading}
            loadingText="Guardando..."
          >
            Guardar y continuar
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleLogout}
            className="text-sm text-[var(--link-color)] hover:text-[var(--text-color)] bg-transparent border-none cursor-pointer underline"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
