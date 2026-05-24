"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "./Input";
import { Label } from "./Label";

interface SearchableSelectProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: boolean;
  errorMessage?: string;
}

export function SearchableSelect({
  items,
  value,
  onChange,
  placeholder = "Seleccionar...",
  label,
  error,
  errorMessage,
}: SearchableSelectProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;
    return items.filter((item) => item.toLowerCase().includes(normalizedQuery));
  }, [items, query]);

  return (
    <div ref={wrapperRef} className="relative">
      {label && <Label className="mb-3 text-lg font-bold text-[var(--text-color)]">{label}</Label>}
      <div className="relative">
        <Input
          autoComplete="off"
          type="text"
          className="pr-10"
          placeholder={placeholder}
          value={value || query}
          error={error}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange("");
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (value) {
              setQuery("");
              onChange("");
            }
          }}
        />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-[var(--text-color)] opacity-50">
          <span className="material-symbols-outlined">unfold_more</span>
        </div>
        {error && errorMessage && (
          <p className="absolute -bottom-5 left-0 mt-1 text-xs font-medium text-red-500">
            {errorMessage}
          </p>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[var(--border-light)] bg-[var(--container-bg)] shadow-lg dark:border-[var(--border-dark)]">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--text-color)] opacity-70">
              No se encontraron resultados.
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item}
                type="button"
                className="block w-full px-4 py-3 text-left text-sm text-[var(--text-color)] transition-colors hover:bg-[var(--button-bg)] hover:text-white"
                onClick={() => {
                  onChange(item);
                  setQuery("");
                  setIsOpen(false);
                }}
              >
                {item}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
