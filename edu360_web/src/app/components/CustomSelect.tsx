import { useState, useRef, useEffect } from "react";

interface Props {
  availableKeys: string[];
  value?: string;
  onChange?: (key: string) => void;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  optionClassName?: string;
  selectedValueClassName?: string;
}

export default function CustomSelect(props: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState(
    props.value ?? props.availableKeys[0],
  );
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">(
    "down",
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  const estimateDropdownHeight = () => {
    const ESTIMATED_ITEM_HEIGHT = 36;
    const MAX_HEIGHT = 192;
    const estimatedHeight = props.availableKeys.length * ESTIMATED_ITEM_HEIGHT;
    return Math.min(estimatedHeight, MAX_HEIGHT);
  };

  const determineDropdownDirection = () => {
    if (typeof window === "undefined" || !wrapperRef.current) {
      return "down";
    }

    const rect = wrapperRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = estimateDropdownHeight();

    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      return "up";
    }

    return "down";
  };

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

  useEffect(() => {
    if (props.value !== undefined) {
      setSelectedKey(props.value);
      return;
    }

    setSelectedKey((current) => {
      if (props.availableKeys.includes(current)) {
        return current;
      }

      return props.availableKeys[0];
    });
  }, [props.value, props.availableKeys]);

  const handleSelection = (key: string) => {
    if (props.value === undefined) {
      setSelectedKey(key);
    }

    props.onChange?.(key);
    setIsOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full ${props.className ? props.className : ""}`}
    >
      <select
        className="sr-only"
        value={selectedKey}
        aria-hidden="true"
        onChange={(event) => handleSelection(event.target.value)}
      >
        {props.availableKeys.map((key, index) => (
          <option key={`${key}-${index}`}>{key}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            setDropdownDirection(determineDropdownDirection());
          }

          setIsOpen(!isOpen);
        }}
        className={`flex w-full items-center justify-between rounded-lg border border-[var(--secondary)] bg-white px-3 py-1 text-xs text-[var(--text)] transition hover:border-[var(--accent)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] ${
          props.triggerClassName ? props.triggerClassName : ""
        }`}
      >
        <span
          className={`flex-1 text-left ${
            props.selectedValueClassName ? props.selectedValueClassName : ""
          }`}
        >
          {selectedKey}
        </span>
        <span
          className={`material-symbols-outlined text-[var(--accent)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <ul
          className={`absolute left-0 z-20 w-full max-h-48 overflow-y-auto rounded-lg border border-[var(--primary)] bg-white shadow-lg ${
            dropdownDirection === "down"
              ? "top-full mt-1 origin-top"
              : "bottom-full mb-1 origin-bottom"
          } ${props.dropdownClassName ? props.dropdownClassName : ""}`}
        >
          {props.availableKeys.map((key, index) => (
            <li
              key={`${key}-${index}`}
              className={`m-0.5 rounded-lg px-3 py-2 text-xs text-[var(--text)] text-left transition hover:bg-[rgba(21,53,147,0.1)] ${
                props.optionClassName ? props.optionClassName : ""
              }`}
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
