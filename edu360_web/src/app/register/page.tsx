'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/auth/hooks/useAuth'
import { db } from '@/app/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'

export default function RegisterPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [role, setRole] = useState<'admin' | 'professor' | null>(null)
  const [activationCode, setActivationCode] = useState('')
  const [step, setStep] = useState(1)

  // Error States
  const [validationError, setValidationError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    role?: boolean;
    activationCode?: boolean;
    selectedCenter?: boolean;
  }>({})

  // Searchable Select State
  const [centerQuery, setCenterQuery] = useState('')
  const [selectedCenter, setSelectedCenter] = useState('')
  const [isCenterOpen, setIsCenterOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [centers, setCenters] = useState<string[]>([])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsCenterOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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

  const filteredCenters = centerQuery === ''
    ? centers
    : centers.filter((center) =>
      center.toLowerCase().includes(centerQuery.toLowerCase())
    )

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
    if (!selectedCenter) {
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
          center: selectedCenter,
          code: activationCode,
          role: role,
        }),
      })

      const data = await response.json()

      if (data.valid) {
        // If user is already logged in (Complete Profile flow), update their profile directly
        if (user) {
          try {
            await setDoc(doc(db, "users", user.uid), {
              role: role,
              center: selectedCenter,
              updatedAt: new Date().toISOString(),
            }, { merge: true })

            router.push('/welcome')
          } catch (error) {
            console.error("Error updating profile:", error)
            setValidationError("Error al actualizar el perfil. Por favor intenta de nuevo.")
          }
        } else {
          // Normal registration flow: Proceed to step 2
          console.log("Validation successful")
          setStep(2)
        }
      } else {
        // Generic error for security
        setValidationError("Invalid")
      }
    } catch (error) {
      console.error("Validation error:", error)
      setValidationError("Error")
    } finally {
      setIsValidating(false)
    }
  }

  if (step === 2) {
    return (
      <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#f6f6f8] dark:bg-[#101622] group/design-root overflow-x-hidden font-sans">
        <div className="layout-container flex h-full grow flex-col">
          <div className="px-4 flex flex-1 justify-center items-center py-5">
            <div className="layout-content-container flex flex-col w-full max-w-md flex-1">
              <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col items-center text-center w-full">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#135bec] mb-4">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '28px' }}>school</span>
                  </div>
                  <h1 className="text-[#111318] dark:text-zinc-100 tracking-tight text-[32px] font-bold leading-tight pb-2 pt-2">¡Código validado!</h1>
                  <p className="text-[#616f89] dark:text-zinc-400 text-base font-normal leading-normal pb-6">Listo para crear tu cuenta. Elige tu método de registro preferido.</p>
                </div>
                <div className="w-full flex flex-col gap-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-[#111318] dark:text-zinc-100 text-sm font-medium leading-tight tracking-[-0.015em] text-left pb-2 block" htmlFor="email">Correo Electrónico</label>
                      <input className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-[#111318] dark:text-zinc-100 placeholder:text-zinc-400 focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/40 transition-colors" id="email" placeholder="nombre@ejemplo.com" type="email" />
                    </div>
                    <div>
                      <label className="text-[#111318] dark:text-zinc-100 text-sm font-medium leading-tight tracking-[-0.015em] text-left pb-2 block" htmlFor="password">Contraseña</label>
                      <input className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-[#111318] dark:text-zinc-100 placeholder:text-zinc-400 focus:border-[#135bec] focus:outline-none focus:ring-2 focus:ring-[#135bec]/40 transition-colors" id="password" placeholder="••••••••" type="password" />
                    </div>
                    <button className="w-full h-11 px-6 bg-[#135bec] text-white rounded-lg text-base font-bold flex items-center justify-center hover:bg-[#135bec]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#135bec]/50 dark:focus:ring-offset-[#101622] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                      Registrarse con Correo
                    </button>
                  </div>
                  <div className="relative flex items-center py-4">
                    <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
                    <span className="flex-shrink mx-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">O CONTINUAR CON</span>
                    <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <button className="w-full h-11 px-4 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-lg text-sm font-medium flex items-center justify-center border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400 dark:focus:ring-offset-[#101622] transition-colors">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt="Google logo" className="h-5 w-5 mr-3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjeGtd2Oj1exKgi7O8CRZv4MSRXVgYB2OlZN0537NUthIjgfKU98-ELpA9PZGcuWx-fOl2N9i4BGcFuafCM0Vm5VDVQXw9v73tsH_BK9w9KxKebBfW4w4ueWtAKgKftEw3NovvyrRYt21cbJWQoHlbX3Lq7Yhbq77LJarsolC-J9VupG_6y9ufsuhs5GQY0UQqMc66Oq7xILEHWDGN4Y_mjIW10MknphcCt6B5zAETVudNvoeqXmoSKx4Ie_5O49QnD1gFAehUTTo" />
                      Continuar con Google
                    </button>
                    <button className="w-full h-11 px-4 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-lg text-sm font-medium flex items-center justify-center border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400 dark:focus:ring-offset-[#101622] transition-colors">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt="Microsoft logo" className="h-5 w-5 mr-3" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8oxT1z0h2QXPJL-5BerTNj5PIuL8aoNfXxf7MsMwAZhyicD132ustzB72bFFwl7Ne1LY7368Nb3GIVtKherZogoFQiPfTQuMratkZhsKdMhmoLxR2-b8ZR4txc2mmzqrXZXJWoNjkQi26C6dtF6m7jVVJ0KFK_PEF0Kt4dw2V7lMbcHmDIwTSX2sLqFQSt8AynSBRybTD3FVGoKQDW2ooM2aIZcmHgFEgcKmf-tVKJ0FLpAFAbcSGkwfsg2MRbBOGFx96kcpgU6w" />
                      Continuar con Microsoft
                    </button>
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
              <p className="text-sm text-red-700 dark:text-red-300">La información proporcionada no es válida. Por favor, revisa tus datos.</p>
            </div>
          </div>
        )}

        <div className="w-full flex flex-col gap-6">

          {/* Role Selection */}
          <div>
            <h2 className="text-[var(--text-color)] text-lg font-bold mb-3">Selecciona tu rol</h2>
            <div className="grid grid-cols-2 gap-4">
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
            <input
              className={`w-full px-4 py-3 bg-transparent border-b-2 text-[var(--text-color)] placeholder:text-[var(--placeholder-color)] focus:outline-none transition-colors ${fieldErrors.activationCode
                ? 'border-red-500 focus:border-red-500'
                : 'border-[var(--text-color)] focus:border-[var(--button-bg)]'
                }`}
              id="activation-code"
              placeholder="Ingresa el código proporcionado"
              type="text"
              value={activationCode}
              onChange={(e) => {
                setActivationCode(e.target.value)
                setFieldErrors(prev => ({ ...prev, activationCode: false }))
              }}
            />
            {fieldErrors.activationCode && (
              <p className="text-red-500 text-xs mt-1 font-medium">Campo requerido</p>
            )}
          </div>

          {/* Education Center (Searchable Select) */}
          <div className="relative" ref={wrapperRef}>
            <label className="text-[var(--text-color)] text-lg font-bold mb-3 block" htmlFor="education-center">
              Centro Educativo
            </label>
            <div className="relative">
              <input
                id="education-center"
                type="text"
                className={`w-full px-4 py-3 bg-transparent border-b-2 text-[var(--text-color)] placeholder:text-[var(--placeholder-color)] focus:outline-none transition-colors pr-10 ${fieldErrors.selectedCenter
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[var(--text-color)] focus:border-[var(--button-bg)]'
                  }`}
                placeholder="Buscar centro educativo..."
                value={selectedCenter ? selectedCenter : centerQuery}
                onChange={(e) => {
                  setCenterQuery(e.target.value)
                  setSelectedCenter('') // Clear selection when typing
                  setIsCenterOpen(true)
                  setFieldErrors(prev => ({ ...prev, selectedCenter: false }))
                }}
                onFocus={() => {
                  setIsCenterOpen(true)
                  if (selectedCenter) {
                    setCenterQuery('')
                    setSelectedCenter('')
                  }
                }}
              />
              {fieldErrors.selectedCenter && (
                <p className="text-red-500 text-xs mt-1 font-medium absolute -bottom-5 left-0">Campo requerido</p>
              )}
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[var(--text-color)] opacity-50">
                <span className="material-symbols-outlined">unfold_more</span>
              </div>
            </div>

            {/* Dropdown List */}
            {isCenterOpen && (
              <div className="absolute z-10 w-full mt-1 bg-[var(--container-bg)] border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredCenters.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[var(--text-color)] opacity-70">
                    No se encontraron resultados.
                  </div>
                ) : (
                  filteredCenters.map((center) => (
                    <div
                      key={center}
                      className="px-4 py-3 text-sm text-[var(--text-color)] hover:bg-[var(--button-bg)] hover:text-white cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedCenter(center)
                        setCenterQuery('')
                        setIsCenterOpen(false)
                        setFieldErrors(prev => ({ ...prev, selectedCenter: false }))
                      }}
                    >
                      {center}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>

        <div className="w-full pt-8">
          <button
            onClick={handleContinue}
            disabled={isValidating}
            className="w-full bg-[var(--button-bg)] text-[var(--button-text)] font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isValidating ? 'Verificando...' : 'Verificar y continuar'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link href="/auth" className="text-sm text-[var(--link-color)] hover:text-[var(--text-color)]">
            Volver al inicio de sesión
          </Link>
        </div>

      </div>
    </div>
  )
}
