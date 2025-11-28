import React, { useState, useRef, useEffect } from 'react'
import { Input } from './Input'

interface SearchableSelectProps {
    items: string[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    label?: string
    error?: boolean
    errorMessage?: string
}

export function SearchableSelect({
    items,
    value,
    onChange,
    placeholder = "Seleccionar...",
    label,
    error,
    errorMessage
}: SearchableSelectProps) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const filteredItems = query === ''
        ? items
        : items.filter((item) =>
            item.toLowerCase().includes(query.toLowerCase())
        )

    return (
        <div className="relative" ref={wrapperRef}>
            {label && (
                <label className="text-[var(--text-color)] text-lg font-bold mb-3 block">
                    {label}
                </label>
            )}
            <div className="relative">
                <Input
                    autoComplete='off'
                    type="text"
                    className="pr-10"
                    placeholder={placeholder}
                    value={value ? value : query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        onChange('') // Clear selection when typing
                        setIsOpen(true)
                    }}
                    onFocus={() => {
                        setIsOpen(true)
                        if (value) {
                            setQuery('')
                            onChange('')
                        }
                    }}
                    error={error}
                />
                {error && errorMessage && (
                    <p className="text-red-500 text-xs mt-1 font-medium absolute -bottom-5 left-0">{errorMessage}</p>
                )}
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-[var(--text-color)] opacity-50">
                    <span className="material-symbols-outlined">unfold_more</span>
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--container-bg)] border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredItems.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-[var(--text-color)] opacity-70">
                            No se encontraron resultados.
                        </div>
                    ) : (
                        filteredItems.map((item) => (
                            <div
                                key={item}
                                className="px-4 py-3 text-sm text-[var(--text-color)] hover:bg-[var(--button-bg)] hover:text-white cursor-pointer transition-colors"
                                onClick={() => {
                                    onChange(item)
                                    setQuery('')
                                    setIsOpen(false)
                                }}
                            >
                                {item}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
