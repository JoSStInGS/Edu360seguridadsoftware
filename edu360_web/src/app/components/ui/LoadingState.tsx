import { Spinner } from "./Spinner";

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Cargando..." }: LoadingStateProps) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center gap-3 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
