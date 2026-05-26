'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/auth/hooks/useAuth'
import { createClient } from '@/app/lib/supabase/client'
import { GoogleButton } from '@/app/auth/components/SocialButtons'
import { Input } from '@/app/components/Input'
import { Button } from '@/app/components/Button'
import { SearchableSelect } from '@/app/components/SearchableSelect'
import { registerWithEmail, signInWithGoogle, isMepEmail, logout, getUserRole } from '@/app/auth/services/auth'

type RegistrationRole = 'admin' | 'professor' | 'parent'
type RegisterFieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const supabase = createClient()
const PENDING_REGISTRATION_KEY = 'edu360_pending_registration'
const passwordMessage = "Usa al menos 9 caracteres, una mayúscula, una minúscula y un número."
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{9,}$/

function validateRegisterFields(email: string, password: string, confirmPassword: string) {
  const errors: RegisterFieldErrors = {}
  const normalizedEmail = email.trim()

  if (!normalizedEmail) {
    errors.email = "Ingresa tu correo electrónico."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.email = "Ingresa un correo electrónico válido."
  }

  if (!password) {
    errors.password = "Ingresa una contraseña."
  } else if (!passwordRegex.test(password)) {
    errors.password = passwordMessage
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña."
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden."
  }

  return errors
}

export default function CompleteProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [role, setRole] = useState<RegistrationRole | null>(null)
  const [activationCode, setActivationCode] = useState('')
  const [step, setStep] = useState(1)

  // Error States
  const [validationError, setValidationError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    role?: boolean;
    activationCode?: boolean;
    selectedCenter?: boolean;
  }>({})

  // Step 2 State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerFieldErrors, setRegisterFieldErrors] = useState<RegisterFieldErrors>({})
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null)

  // Searchable Select State
  const [selectedCenterId, setSelectedCenterId] = useState('')
  const [selectedCenterName, setSelectedCenterName] = useState('')
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const response = await fetch('/api/centers')
        if (response.ok) {
          const data = await response.json()
          setCenters(data.centers)
        } else {
          console.error("Failed to fetch centers")
        }
      } catch (error) {
        console.error("Error fetching centers:", error)
      }
    }
    fetchCenters()
  }, [])

  const completeRegistration = async (token?: string) => {
    const response = await fetch('/api/registration/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        center: selectedCenterId,
        code: activationCode,
        role,
        mepEmail: email && role ? isMepEmail(email, [role]) ? email.trim().toLowerCase() : null : null,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error ?? 'No se pudo completar el registro')
    }
    localStorage.removeItem(PENDING_REGISTRATION_KEY)
  }

  const createRegistrationIntent = async () => {
    const response = await fetch('/api/registration/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        center: selectedCenterId,
        code: activationCode,
        role,
        email: email.trim().toLowerCase(),
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error ?? 'No se pudo preparar el registro')
    }
  }

  useEffect(() => {
    if (!user || authLoading) return

    const pending = localStorage.getItem(PENDING_REGISTRATION_KEY)
    if (!pending) {
      void (async () => {
        const role = await getUserRole(user.id)
        if (role) router.replace('/welcome')
      })()
      return
    }

    try {
      const data = JSON.parse(pending) as {
        role: RegistrationRole;
        activationCode: string;
        selectedCenterId: string;
        selectedCenterName: string;
        email: string;
      }

      setRole(data.role)
      setActivationCode(data.activationCode)
      setSelectedCenterId(data.selectedCenterId)
      setSelectedCenterName(data.selectedCenterName)
      setEmail(data.email)

      void (async () => {
        setRegisterLoading(true)
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          await fetch('/api/registration/complete', {
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
          }).then(async (response) => {
            const payload = await response.json()
            if (!response.ok) throw new Error(payload.error ?? 'No se pudo completar el registro')
          })
          localStorage.removeItem(PENDING_REGISTRATION_KEY)
          router.replace('/welcome')
        } catch (error) {
          setValidationError(error instanceof Error ? error.message : 'No se pudo completar el registro')
        } finally {
          setRegisterLoading(false)
        }
      })()
    } catch {
      localStorage.removeItem(PENDING_REGISTRATION_KEY)
    }
  }, [authLoading, router, user])

  const [isValidating, setIsValidating] = useState(false)

  const handleContinue = async () => {
    setValidationError(null)
    setFieldErrors({})

    const newFieldErrors: { role?: boolean; activationCode?: boolean; selectedCenter?: boolean } = {}
    let hasError = false

    if (!role) {
      newFieldErrors.role = true
      hasError = true
    }
    if (!activationCode) {
      newFieldErrors.activationCode = true
      hasError = true
    }
    if (!selectedCenterId) {
      newFieldErrors.selectedCenter = true
      hasError = true
    }

    if (hasError) {
      setFieldErrors(newFieldErrors)
      return
    }

    setIsValidating(true)
    try {
      const response = await fetch('/api/validate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          center: selectedCenterId, // Send ID for validation
          code: activationCode,
          role: role,
        }),
      })

      const data = await response.json()

      if (data.valid) {
        // If user is already logged in (Complete Profile flow), update their profile directly
        if (user) {
          try {
            const { data: sessionData } = await supabase.auth.getSession()
            await completeRegistration(sessionData.session?.access_token)
            router.push('/welcome')
          } catch (error) {
            console.error("Error updating profile:", error)
            setValidationError(error instanceof Error ? error.message : "Error al actualizar el perfil. Por favor intenta de nuevo.")
          }
        } else {
          setStep(2)
        }
      } else {
        setValidationError(data.message ?? "El código no es válido")
      }
    } catch (error) {
      console.error("Validation error:", error)
      setValidationError("Error")
    } finally {
      setIsValidating(false)
    }
  }

  const handleEmailRegister = async () => {
    const errors = validateRegisterFields(email, password, confirmPassword)
    setRegisterFieldErrors(errors)
    setValidationError(null)
    setRegistrationNotice(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setRegisterLoading(true)

    try {
      await createRegistrationIntent()
      await registerWithEmail(email, password)

      localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify({
        role,
        activationCode,
        selectedCenterId,
        selectedCenterName,
        email: email.trim().toLowerCase(),
      }))

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.access_token) {
        setRegistrationNotice("Cuenta creada. Revisa tu correo para confirmarla. Después verás una pantalla de confirmación y deberás iniciar sesión nuevamente.")
        return
      }

      await completeRegistration(sessionData.session.access_token)

      // If MEP email not auto-saved, redirect to capture page
      if (!isMepEmail(email, [role!])) {
        router.push('/auth/mep-email')
      } else {
        router.push('/welcome')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrarse"
      setValidationError(message)
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleSocialRegister = async () => {
    setRegisterLoading(true)
    setValidationError(null)
    try {
      localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify({
        role,
        activationCode,
        selectedCenterId,
        selectedCenterName,
        email,
      }))
      await signInWithGoogle()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al registrarse con Google"
      setValidationError(message)
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleBackToLogin = async () => {
    try {
      if (user) await logout()
    } catch (error) {
      console.error("Error deleting user:", error)
    }
    router.push('/auth')
  }

  if (step === 2) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#f6f6f8] dark:bg-[#101622] group/design-root overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <div className="px-4 flex flex-1 justify-center items-center py-5">
            <div className="layout-content-container flex flex-col w-full max-w-md flex-1">
              <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col items-center text-center w-full">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#135bec] mb-4">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '28px' }}>school</span>
                  </div>
                  <h1 className="text-3xl font-bold text-[var(--text-color)] pb-2 pt-2">¡Código validado!</h1>
                  <p className="text-[var(--text-color)] opacity-70 text-base font-normal pb-6">Listo para crear tu cuenta. Elige tu método de registro preferido.</p>
                </div>
                {validationError && (
                  <div className="mb-4 flex w-full items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <span className="material-symbols-outlined mt-0.5 text-red-500">error</span>
                    <p className="text-sm text-red-700 dark:text-red-300">{validationError}</p>
                  </div>
                )}
                {registrationNotice && (
                  <div className="mb-4 flex w-full items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                    <span className="material-symbols-outlined mt-0.5 text-green-600">check_circle</span>
                    <p className="text-sm text-green-700 dark:text-green-300">{registrationNotice}</p>
                  </div>
                )}
                <div className="w-full flex flex-col gap-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="sr-only" htmlFor="email">Correo Electrónico</label>
                      <Input
                        id="email"
                        placeholder="Correo Electrónico"
                        type="email"
                        value={email}
                        error={Boolean(registerFieldErrors.email)}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setRegisterFieldErrors((prev) => ({ ...prev, email: undefined }))
                        }}
                      />
                      {registerFieldErrors.email && (
                        <p className="mt-1 text-xs font-medium text-red-500">{registerFieldErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="sr-only" htmlFor="password">Contraseña</label>
                      <Input
                        id="password"
                        placeholder="Contraseña"
                        type="password"
                        value={password}
                        error={Boolean(registerFieldErrors.password)}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setRegisterFieldErrors((prev) => ({ ...prev, password: undefined }))
                        }}
                      />
                      <p className={`mt-1 text-xs ${registerFieldErrors.password ? "font-medium text-red-500" : "text-zinc-500 dark:text-zinc-400"}`}>
                        {registerFieldErrors.password ?? passwordMessage}
                      </p>
                    </div>
                    <div>
                      <label className="sr-only" htmlFor="confirm-password">Confirmar Contraseña</label>
                      <Input
                        id="confirm-password"
                        placeholder="Confirmar Contraseña"
                        type="password"
                        value={confirmPassword}
                        error={Boolean(registerFieldErrors.confirmPassword)}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          setRegisterFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                        }}
                      />
                      {registerFieldErrors.confirmPassword && (
                        <p className="mt-1 text-xs font-medium text-red-500">{registerFieldErrors.confirmPassword}</p>
                      )}
                    </div>
                    <Button
                      className="mt-2"
                      onClick={handleEmailRegister}
                      loading={registerLoading}
                      loadingText="Registrando..."
                    >
                      Registrarse con Correo
                    </Button>
                  </div>
                  <div className="relative flex items-center py-4">
                    <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
                    <span className="flex-shrink mx-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">O CONTINUAR CON</span>
                    <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <GoogleButton
                      text="Continuar con Google"
                      onClick={() => handleSocialRegister()}
                      loading={registerLoading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-color)] flex items-center justify-center min-h-screen p-4">
      <div className="bg-[var(--container-bg)] rounded-2xl shadow-2xl p-8 w-full max-w-md border border-[var(--border-light)] dark:border-[var(--border-dark)]">

        {/* Header */}
        <div className="flex flex-col items-center text-center w-full mb-8">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[var(--button-bg)] mb-4">
            <span className="material-symbols-outlined text-white" style={{ fontSize: '28px' }}>school</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-color)] pb-2">¡Bienvenido a EDU360!</h1>
          <p className="text-[var(--text-color)] opacity-70 text-base font-normal">Para comenzar, por favor configura tu perfil.</p>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 flex gap-3 items-start">
            <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
            <div>
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">Error de validación</h3>
              <p className="text-sm text-red-700 dark:text-red-300">{validationError}</p>
            </div>
          </div>
        )}

        <div className="w-full flex flex-col gap-6">

          {/* Role Selection */}
          <div>
            <h2 className="text-[var(--text-color)] text-lg font-bold mb-3">Selecciona tu rol</h2>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setRole('admin')
                  setFieldErrors(prev => ({ ...prev, role: false }))
                }}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 group ${role === 'admin'
                  ? 'border-[var(--button-bg)] bg-[var(--button-bg)]/10 ring-2 ring-[var(--button-bg)]/20'
                  : fieldErrors.role
                    ? 'border-red-500 bg-red-50/10'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-[var(--button-bg)] focus:border-[var(--button-bg)]'
                  }`}
              >
                <span
                  className={`material-symbols-outlined ${role === 'admin' ? 'text-[var(--button-bg)]' : fieldErrors.role ? 'text-red-500' : 'text-zinc-500 group-hover:text-[var(--button-bg)]'}`}
                  style={{ fontSize: '32px' }}
                >
                  corporate_fare
                </span>
                <p className={`text-sm font-bold ${role === 'admin' ? 'text-[var(--button-bg)]' : fieldErrors.role ? 'text-red-500' : 'text-[var(--text-color)] group-hover:text-[var(--button-bg)]'}`}>
                  Administrativo
                </p>
              </button>

              <button
                onClick={() => {
                  setRole('professor')
                  setFieldErrors(prev => ({ ...prev, role: false }))
                }}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 group ${role === 'professor'
                  ? 'border-[var(--button-bg)] bg-[var(--button-bg)]/10 ring-2 ring-[var(--button-bg)]/20'
                  : fieldErrors.role
                    ? 'border-red-500 bg-red-50/10'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-[var(--button-bg)] focus:border-[var(--button-bg)]'
                  }`}
              >
                <span
                  className={`material-symbols-outlined ${role === 'professor' ? 'text-[var(--button-bg)]' : fieldErrors.role ? 'text-red-500' : 'text-zinc-500 group-hover:text-[var(--button-bg)]'}`}
                  style={{ fontSize: '32px' }}
                >
                  person
                </span>
                <p className={`text-sm font-bold ${role === 'professor' ? 'text-[var(--button-bg)]' : fieldErrors.role ? 'text-red-500' : 'text-[var(--text-color)] group-hover:text-[var(--button-bg)]'}`}>
                  Profesor
                </p>
              </button>

              <button
                onClick={() => {
                  setRole('parent')
                  setFieldErrors(prev => ({ ...prev, role: false }))
                }}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 group ${role === 'parent'
                  ? 'border-[var(--button-bg)] bg-[var(--button-bg)]/10 ring-2 ring-[var(--button-bg)]/20'
                  : fieldErrors.role
                    ? 'border-red-500 bg-red-50/10'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-[var(--button-bg)] focus:border-[var(--button-bg)]'
                  }`}
              >
                <span
                  className={`material-symbols-outlined ${role === 'parent' ? 'text-[var(--button-bg)]' : fieldErrors.role ? 'text-red-500' : 'text-zinc-500 group-hover:text-[var(--button-bg)]'}`}
                  style={{ fontSize: '32px' }}
                >
                  family_restroom
                </span>
                <p className={`text-sm font-bold ${role === 'parent' ? 'text-[var(--button-bg)]' : fieldErrors.role ? 'text-red-500' : 'text-[var(--text-color)] group-hover:text-[var(--button-bg)]'}`}>
                  Encargado
                </p>
              </button>
            </div>
            {fieldErrors.role && (
              <p className="text-red-500 text-xs mt-2 font-medium">Por favor selecciona un rol</p>
            )}
          </div>

          {/* Activation Code */}
          <div>
            <label className="text-[var(--text-color)] text-lg font-bold mb-3 block" htmlFor="activation-code">
              Código de Activación
            </label>
            <Input
              id="activation-code"
              placeholder="Ingresa el código proporcionado"
              type="text"
              value={activationCode}
              onChange={(e) => {
                setActivationCode(e.target.value)
                setFieldErrors(prev => ({ ...prev, activationCode: false }))
              }}
              error={fieldErrors.activationCode}
            />
            {fieldErrors.activationCode && (
              <p className="text-red-500 text-xs mt-1 font-medium">Campo requerido</p>
            )}
          </div>

          {/* Education Center (Searchable Select) */}
          <SearchableSelect
            label="Centro Educativo"
            placeholder="Buscar centro educativo..."
            items={centers.map(c => c.name)}
            value={selectedCenterName}
            onChange={(value) => {
              const center = centers.find(c => c.name === value)
              if (center) {
                setSelectedCenterId(center.id)
                setSelectedCenterName(center.name)
                setFieldErrors(prev => ({ ...prev, selectedCenter: false }))
              } else {
                setSelectedCenterId('')
                setSelectedCenterName('')
              }
            }}
            error={fieldErrors.selectedCenter}
            errorMessage="Campo requerido"
          />

        </div>

        <div className="w-full pt-8">
          <Button
            onClick={handleContinue}
            disabled={isValidating || authLoading}
            loading={isValidating || authLoading}
            loadingText={authLoading ? "Cargando..." : "Verificando..."}
          >
            Verificar y continuar
          </Button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={handleBackToLogin}
            className="text-sm text-[var(--link-color)] hover:text-[var(--text-color)] bg-transparent border-none cursor-pointer underline"
          >
            Volver al inicio de sesión
          </button>
        </div>

      </div>
    </div>
  )
}
