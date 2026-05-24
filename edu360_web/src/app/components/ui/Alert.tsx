import type { ReactNode } from "react";

interface AlertProps {
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
  icon?: string;
}

const tones = {
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200",
  success: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200",
  danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300",
};

export function Alert({ children, tone = "info", icon = "info" }: AlertProps) {
  return (
    <div className={["flex items-start gap-3 rounded-lg border p-4 text-sm", tones[tone]].join(" ")}>
      <span className="material-symbols-outlined mt-0.5 text-xl">{icon}</span>
      <div>{children}</div>
    </div>
  );
}
