import type { LabelHTMLAttributes, ReactNode } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export function Label({ children, className, ...props }: LabelProps) {
  return (
    <label
      className={[
        "block text-sm font-medium text-[var(--muted-light)] dark:text-[var(--muted-dark)]",
        className ?? "",
      ].join(" ")}
      {...props}
    >
      {children}
    </label>
  );
}
