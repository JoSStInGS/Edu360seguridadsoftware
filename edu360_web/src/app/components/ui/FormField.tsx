import type { ReactNode } from "react";
import { Label } from "./Label";

interface FormFieldProps {
  children: ReactNode;
  label?: string;
  htmlFor?: string;
  error?: string | null;
}

export function FormField({ children, label, htmlFor, error }: FormFieldProps) {
  return (
    <div>
      {label && (
        <Label htmlFor={htmlFor} className="mb-2 text-[var(--text-color)]">
          {label}
        </Label>
      )}
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}
