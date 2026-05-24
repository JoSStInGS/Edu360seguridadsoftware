import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between xl:mb-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold">{title}</h2>
        {description && (
          <p className="text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
