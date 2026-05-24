import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "inbox", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
      <span className="material-symbols-outlined text-4xl">{icon}</span>
      <h3 className="text-base font-semibold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
        {title}
      </h3>
      {description && <p className="max-w-md text-sm">{description}</p>}
      {action}
    </div>
  );
}
