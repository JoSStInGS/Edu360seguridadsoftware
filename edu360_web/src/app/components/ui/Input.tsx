import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ className, error, ...props }: InputProps) {
  return (
    <input
      className={[
        "w-full bg-transparent px-4 py-3 font-inherit placeholder:text-[var(--placeholder-color)] transition-colors focus:outline-none",
        "border-b-2",
        error
          ? "border-red-500 text-red-500 focus:border-red-500"
          : "border-[var(--text-color)] text-[var(--text-color)] focus:border-[var(--button-bg)]",
        className ?? "",
      ].join(" ")}
      {...props}
    />
  );
}
