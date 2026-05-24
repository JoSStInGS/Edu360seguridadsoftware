"use client";

interface ChoiceCardOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

interface ChoiceCardGroupProps<T extends string> {
  label?: string;
  options: ChoiceCardOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
}

const columnsClass = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export function ChoiceCardGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 3,
}: ChoiceCardGroupProps<T>) {
  return (
    <div>
      {label && (
        <label className="mb-3 block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
          {label}
        </label>
      )}
      <div className={["grid gap-3", columnsClass[columns]].join(" ")}>
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={[
                "flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 text-center transition-all",
                selected
                  ? "border-[var(--primary)] bg-[var(--primary)]/10"
                  : "border-[var(--border-light)] hover:border-[var(--primary)] dark:border-[var(--border-dark)]",
              ].join(" ")}
            >
              {option.icon && (
                <span
                  className={[
                    "material-symbols-outlined text-2xl",
                    selected
                      ? "text-[var(--primary)]"
                      : "text-[var(--muted-light)] dark:text-[var(--muted-dark)]",
                  ].join(" ")}
                >
                  {option.icon}
                </span>
              )}
              <span
                className={[
                  "text-xs font-semibold",
                  selected
                    ? "text-[var(--primary)]"
                    : "text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]",
                ].join(" ")}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
