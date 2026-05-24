"use client";

import { useEffect, useRef, useState } from "react";

interface SelectProps {
  availableKeys: string[];
  value?: string;
  onChange?: (key: string) => void;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  optionClassName?: string;
  selectedValueClassName?: string;
}

export function Select({
  availableKeys,
  value,
  onChange,
  className,
  triggerClassName,
  dropdownClassName,
  optionClassName,
  selectedValueClassName,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState(value ?? availableKeys[0] ?? "");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedKey(value ?? availableKeys[0] ?? "");
  }, [availableKeys, value]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const handleSelection = (key: string) => {
    if (value === undefined) setSelectedKey(key);
    onChange?.(key);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={["relative w-full", className ?? ""].join(" ")}>
      <select
        className="sr-only"
        value={selectedKey}
        aria-hidden="true"
        onChange={(event) => handleSelection(event.target.value)}
      >
        {availableKeys.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>

      <button
        type="button"
        className={[
          "flex w-full items-center justify-between rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm text-[var(--foreground-light)] transition hover:border-[var(--primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)] dark:text-[var(--foreground-dark)]",
          triggerClassName ?? "",
        ].join(" ")}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className={["flex-1 text-left", selectedValueClassName ?? ""].join(" ")}>
          {selectedKey}
        </span>
        <span className={["material-symbols-outlined transition-transform", isOpen ? "rotate-180" : ""].join(" ")}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <ul
          className={[
            "absolute left-0 top-full z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] shadow-lg dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]",
            dropdownClassName ?? "",
          ].join(" ")}
        >
          {availableKeys.map((key) => (
            <li
              key={key}
              className={[
                "m-0.5 cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground-light)] transition hover:bg-[rgba(15,23,42,0.06)] dark:text-[var(--foreground-dark)] dark:hover:bg-[rgba(255,255,255,0.06)]",
                optionClassName ?? "",
              ].join(" ")}
              onClick={() => handleSelection(key)}
            >
              {key}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
