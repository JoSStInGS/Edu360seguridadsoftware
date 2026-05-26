import Link from "next/link";

export default function EmailConfirmedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-color)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-light)] bg-[var(--container-bg)] p-8 text-center shadow-2xl dark:border-[var(--border-dark)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
          <span className="material-symbols-outlined text-3xl">check_circle</span>
        </div>
        <h1 className="mb-3 text-3xl font-bold text-[var(--text-color)]">
          Correo confirmado
        </h1>
        <p className="mb-8 text-sm leading-6 text-[var(--text-color)] opacity-75">
          Tu cuenta fue confirmada correctamente. Por seguridad, inicia sesión
          nuevamente para entrar a EDU360.
        </p>
        <Link
          href="/auth"
          className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--button-bg)] px-4 py-3 font-bold text-[var(--button-text)] transition hover:bg-blue-500"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
