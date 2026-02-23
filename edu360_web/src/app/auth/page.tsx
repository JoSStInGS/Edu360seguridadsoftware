'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/auth/hooks/useAuth'
import { getUserRole } from '@/app/auth/services/auth'
import {
  signInWithGoogle,
  signInWithEmail,
} from '@/app/auth/services/auth'
import { auth } from '@/app/lib/firebase'
import { signOut, getRedirectResult } from 'firebase/auth'

import { GoogleButton } from '@/app/auth/components/SocialButtons'
import { Input } from '@/app/components/Input'
import { Button } from '@/app/components/Button'

export default function LoginPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  useEffect(() => {
    let active = true
    const check = async () => {
      // 1. Check if we are returning from a Redirect Login (e.g. Google/Microsoft fallback)
      try {
        const redirectResult = await getRedirectResult(auth)
        if (redirectResult?.user) {
          // If this is a redirect login, we proceed normally
          const role = await getUserRole(redirectResult.user.uid)
          if (!active) return
          router.replace(role ? '/welcome' : '/auth/complete-profile')
          return
        }
      } catch (e) {
        console.error("Redirect result error:", e)
      }

      // 2. Standard check
      if (user) {
        // If we are currently processing a login (Popup or Email), do NOT interfere.
        if (loadingEmail || loadingGoogle) return

        const role = await getUserRole(user.uid)
        if (!active) return

        if (role) {
          router.replace('/welcome')
        } else {
          // User is logged in but has no role, and we are NOT in the middle of a login action.
          // This means they navigated here manually (e.g. via browser bar or back button).
          // We treat this as an "abandoned" registration and clean up.
          console.log("Incomplete user detected on login page. Cleaning up...")
          try {
            await user.delete()
          } catch (error) {
            console.error("Error deleting incomplete user:", error)
            await signOut(auth)
          }
        }
      }
    }
    void check()
    return () => { active = false }
  }, [user, router, loadingEmail, loadingGoogle])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingEmail(true)
    try {
      const u = await signInWithEmail(email, password)
      const role = await getUserRole(u.uid)
      router.push(role ? '/welcome' : '/auth/complete-profile')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      alert(message)
    } finally {
      setLoadingEmail(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true)
    try {
      const u = await signInWithGoogle()
      if (u) {
        const role = await getUserRole(u.uid)
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
