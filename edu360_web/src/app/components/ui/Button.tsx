import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

const variants = {
  primary: "bg-[var(--button-bg)] text-[var(--button-text)] hover:bg-blue-500",
  secondary:
    "border border-[var(--border-light)] bg-transparent text-[var(--text-color)] hover:bg-[rgba(15,23,42,0.04)] dark:border-[var(--border-dark)] dark:hover:bg-[rgba(255,255,255,0.06)]",
  danger:
    "bg-[rgba(231,60,8,0.1)] text-[var(--destructive-light)] hover:bg-[rgba(231,60,8,0.2)] dark:bg-[rgba(229,62,62,0.2)] dark:text-[var(--destructive-dark)]",
  ghost:
    "bg-transparent text-[var(--text-color)] hover:bg-[rgba(15,23,42,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)]",
};

export function Button({
  children,
  loading,
  loadingText,
  className,
  disabled,
  fullWidth = true,
  leftIcon,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={loading || disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-bold transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-60",
        fullWidth ? "w-full" : "",
        variants[variant],
        className ?? "",
      ].join(" ")}
      {...props}
    >
      {loading ? loadingText ?? "Cargando..." : (
        <>
          {leftIcon}
          {children}
        </>
      )}
    </button>
  );
}
