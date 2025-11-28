import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean
}

export function Input({ className, error, ...props }: InputProps) {
    return (
        <input
            className={`w-full px-4 py-3 bg-transparent border-b-2 placeholder:text-[var(--placeholder-color)] focus:outline-none transition-colors font-inherit ${error
                ? 'border-red-500 focus:border-red-500 text-red-500' // Error state
                : 'border-[var(--text-color)] text-[var(--text-color)] focus:border-[var(--button-bg)]' // Normal state
                } ${className || ''}`}
            {...props}
        />
    )
}
