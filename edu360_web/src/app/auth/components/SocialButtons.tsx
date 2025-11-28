import React from 'react'

interface SocialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean
    text?: string
}

export function GoogleButton({ loading, text = "Iniciar con Google", className, ...props }: SocialButtonProps) {
    return (
        <button
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-60 ${className || ''}`}
            {...props}
        >
            {loading ? 'Cargando...' : (
                <span className="flex items-center gap-2 text-sm font-medium">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
                    {text}
                </span>
            )}
        </button>
    )
}

export function MicrosoftButton({ loading, text = "Iniciar con Microsoft", className, ...props }: SocialButtonProps) {
    return (
        <button
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-60 ${className || ''}`}
            {...props}
        >
            {loading ? 'Cargando...' : (
                <span className="flex items-center gap-2 text-sm font-medium">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.5 22.5H2.5V13.5H11.5V22.5ZM21.5 11.5H12.5V2.5H21.5V11.5ZM11.5 11.5H2.5V2.5H11.5V11.5ZM21.5 22.5H12.5V13.5H21.5V22.5Z" />
                    </svg>
                    {text}
                </span>
            )}
        </button>
    )
}
