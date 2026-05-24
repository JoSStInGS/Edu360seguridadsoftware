import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <textarea
      className={[
        "w-full rounded-lg border bg-transparent px-4 py-3 text-[var(--text-color)] placeholder:text-[var(--placeholder-color)] transition-colors focus:outline-none focus:ring-1",
        error
          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
          : "border-[var(--border-light)] focus:border-[var(--button-bg)] focus:ring-[var(--button-bg)] dark:border-[var(--border-dark)]",
        className ?? "",
      ].join(" ")}
      {...props}
    />
  );
}
