import type { ButtonHTMLAttributes } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
}

export function IconButton({ icon, label, className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[rgba(255,255,255,0.08)]",
        className ?? "",
      ].join(" ")}
      {...props}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
    </button>
  );
}
