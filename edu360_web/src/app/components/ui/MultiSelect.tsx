"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

interface MultiSelectProps {
  label?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  emptyMessage?: string;
  helperText?: string;
  noResultsMessage?: string;
  maxVisibleOptions?: number;
}

export function MultiSelect({
  label,
  placeholder = "Buscar...",
  options,
  selectedValues,
  onChange,
  emptyMessage = "No hay opciones disponibles.",
  helperText,
  noResultsMessage = "No se encontraron resultados.",
  maxVisibleOptions = 50,
}: MultiSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const selectedOptions = options.filter((option) => selectedSet.has(option.value));
  const filteredOptions = options.filter((option) => {
    if (selectedSet.has(option.value)) return false;
    if (!search) return true;

    const query = search.toLowerCase();
    return (
      option.value.toLowerCase().includes(query) ||
      option.label.toLowerCase().includes(query) ||
      option.description?.toLowerCase().includes(query)
    );
  });

  const addValue = (value: string) => {
    onChange([...selectedValues, value]);
    setSearch("");
    setIsOpen(false);
  };

  const removeValue = (value: string) => {
    onChange(selectedValues.filter((selectedValue) => selectedValue !== value));
  };

  return (
    <div>
      {label && (
        <label className="mb-2 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
          {label}
        </label>
      )}

      {selectedOptions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--primary)]"
            >
              {option.icon && (
                <span className="material-symbols-outlined text-sm">{option.icon}</span>
              )}
              {option.label}
              <button
                type="button"
                onClick={() => removeValue(option.value)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-[var(--primary)]/20"
                aria-label={`Quitar ${option.label}`}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative" ref={wrapperRef}>
        <div className="relative">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
            search
          </span>
          <input
            type="text"
            placeholder={placeholder}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] py-2.5 pl-9 pr-4 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
          />
        </div>

        {isOpen && (
          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] shadow-lg dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                {options.length === 0 ? emptyMessage : noResultsMessage}
              </div>
            ) : (
              filteredOptions.slice(0, maxVisibleOptions).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => addValue(option.value)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
                >
                  {option.icon && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
                      <span className="material-symbols-outlined text-base text-[var(--primary)]">
                        {option.icon}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                      {option.label}
                    </p>
                    {option.description && (
                      <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                        {option.description}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {helperText && selectedValues.length === 0 && (
        <p className="mt-2 text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
          {helperText}
        </p>
      )}
    </div>
  );
}
