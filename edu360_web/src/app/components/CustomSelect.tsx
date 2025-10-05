import { useState, useRef, useEffect } from "react";

interface Props {
  availableKeys: string[];
}

export default function CustomSelect(props: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <select
        className="sr-only"
        defaultValue={props.availableKeys[0]}
        aria-hidden="true"
      >
        {props.availableKeys.map((key) => (
          <option key={key}>{key}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center rounded-lg border border-[var(--secondary)] bg-white px-3 py-1 text-xs text-[var(--text)]
                   hover:border-[var(--accent)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition"
      >
        <span>{props.availableKeys[0]}</span>
        <span
          className={`material-symbols-outlined text-[var(--accent)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <ul className="absolute mt-1 w-full rounded-lg border border-[var(--primary)] bg-white shadow-lg z-20 max-h-48 overflow-y-auto">
          {props.availableKeys.map((key) => (
            <li
              key={key}
              className="m-0.5 text-center px-3 py-2 text-xs text-[var(--text)] hover:bg-[rgba(21,53,147,0.1)] rounded-lg cursor-pointer transition"
              onClick={() => setIsOpen(false)}
            >
              {key}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
