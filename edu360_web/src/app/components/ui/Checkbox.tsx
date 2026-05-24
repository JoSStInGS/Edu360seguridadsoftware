import type { InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={["inline-flex items-center gap-2 text-sm", className ?? ""].join(" ")}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-[var(--border-light)] text-[var(--primary)] focus:ring-[var(--primary)] dark:border-[var(--border-dark)]"
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  );
}
