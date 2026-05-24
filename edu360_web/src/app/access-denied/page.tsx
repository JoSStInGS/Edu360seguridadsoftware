import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background-light)] px-4 text-center text-[var(--foreground-light)] dark:bg-[var(--background-dark)] dark:text-[var(--foreground-dark)]">
      <span className="material-symbols-outlined text-5xl text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
        block
      </span>
      <h1 className="text-2xl font-bold">Acceso denegado</h1>
      <p className="max-w-md text-sm text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
        Tu usuario no tiene permisos para entrar a esta seccion de Edu360.
      </p>
      <Link
        href="/welcome"
        className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
      >
        Volver
      </Link>
    </main>
  );
}
