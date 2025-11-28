import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean
    loadingText?: string
}

export function Button({ children, loading, loadingText, className, disabled, ...props }: ButtonProps) {
    return (
        <button
            disabled={loading || disabled}
            className={`w-full bg-[var(--button-bg)] text-[var(--button-text)] font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed font-inherit ${className || ''}`}
            {...props}
        >
            {loading ? (loadingText || 'Cargando...') : children}
        </button>
    )
}
