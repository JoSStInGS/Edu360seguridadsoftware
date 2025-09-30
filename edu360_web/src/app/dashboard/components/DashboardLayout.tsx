"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { logout } from "@/app/auth/services/auth";

const NAV_ITEMS = [
  { label: "Inicio", icon: "home", href: "/dashboard" },
  { label: "Estudiantes", icon: "group", href: "/dashboard/students" },
  { label: "Grupos/Secciones", icon: "groups", href: "#" },
  { label: "Asistencia", icon: "event_available", href: "#" },
  { label: "Importar (PIAD)", icon: "upload", href: "#" },
  { label: "Reportes", icon: "monitoring", href: "#" },
  { label: "Auditoría", icon: "policy", href: "#" },
  { label: "Configuración", icon: "settings", href: "#" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const navItems = useMemo(() => NAV_ITEMS, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace("/auth");
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
    // We intentionally only want to react to pathname changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const renderSidebarContent = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="mb-8 flex items-center gap-3">
          <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z" fill="currentColor" />
          </svg>
          <h1 className="text-2xl font-bold">EDU360</h1>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive =
              item.href !== "#" && (pathname === item.href || pathname.startsWith(`${item.href}/`));

            const baseClasses = "flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors";
            const activeClasses = isActive
              ? "bg-[rgba(21,53,147,0.1)] text-[var(--primary)] dark:bg-[rgba(21,53,147,0.2)]"
              : "text-[var(--muted-light)] hover:bg-[rgba(21,53,147,0.1)] hover:text-[var(--primary)] dark:text-[var(--muted-dark)] dark:hover:bg-[rgba(21,53,147,0.2)] dark:hover:text-[var(--primary)]";

            if (item.href === "#") {
              return (
                <span key={item.label} className={`${baseClasses} text-[var(--muted-light)] dark:text-[var(--muted-dark)]`}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`${baseClasses} ${activeClasses}`}
                onClick={onNavigate}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex flex-col gap-2">
        <button className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[var(--muted-light)] transition-colors hover:bg-[rgba(21,53,147,0.1)] hover:text-[var(--primary)] dark:text-[var(--muted-dark)] dark:hover:bg-[rgba(21,53,147,0.2)] dark:hover:text-[var(--primary)]">
          <span className="material-symbols-outlined">theater_comedy</span>
          <span>Simular rol: Dirección</span>
        </button>
        <button
          onClick={async () => {
            await handleLogout();
            onNavigate?.();
          }}
          disabled={isLoggingOut}
          className="flex items-center justify-center gap-2 rounded-lg bg-[rgba(231,60,8,0.1)] px-4 py-2.5 text-sm font-semibold text-[var(--destructive-light)] transition hover:bg-[rgba(231,60,8,0.2)] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[rgba(229,62,62,0.2)] dark:text-[var(--destructive-dark)] dark:hover:bg-[rgba(229,62,62,0.3)]"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background-light)] text-[var(--muted-light)] dark:bg-[var(--background-dark)] dark:text-[var(--muted-dark)]">
        Cargando plataforma...
      </div>
    );
  }

  if (!user) {
    router.replace("/auth");
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background-light)] text-[var(--muted-light)] dark:bg-[var(--background-dark)] dark:text-[var(--muted-dark)]">
        Redirigiendo...
      </div>
    );
  }

  return (
    <>
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="flex h-full w-64 flex-shrink-0 flex-col justify-between border-r border-[var(--border-light)] bg-[var(--card-light)] p-6 dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
            {renderSidebarContent(() => setIsMobileSidebarOpen(false))}
          </div>
          <button
            type="button"
            aria-label="Cerrar navegación"
            className="flex-1 bg-black/40"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        </div>
      )}
      <div className="flex min-h-screen bg-[var(--background-light)] text-[var(--foreground-light)] dark:bg-[var(--background-dark)] dark:text-[var(--foreground-dark)]">
        <aside
          className={`hidden ${isDesktopSidebarVisible ? "lg:flex" : "lg:hidden"} w-64 flex-shrink-0 flex-col justify-between border-r border-[var(--border-light)] bg-[var(--card-light)] p-6 dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]`}
        >
          {renderSidebarContent()}
        </aside>
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-[var(--border-light)] bg-[rgba(246,246,248,0.85)] px-4 sm:px-6 lg:px-8 backdrop-blur-sm dark:border-[var(--border-dark)] dark:bg-[rgba(17,21,33,0.85)]">
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
              <button
                type="button"
                className="rounded-full p-2.5 text-[var(--muted-light)] transition-colors hover:bg-[rgba(21,53,147,0.1)] hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-[var(--muted-dark)] dark:hover:bg-[rgba(21,53,147,0.2)] dark:hover:text-[var(--primary)] lg:hidden"
                aria-label="Abrir navegación"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <button
                type="button"
                className="hidden rounded-full p-2.5 text-[var(--muted-light)] transition-colors hover:bg-[rgba(21,53,147,0.1)] hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-[var(--muted-dark)] dark:hover:bg-[rgba(21,53,147,0.2)] dark:hover:text-[var(--primary)] lg:inline-flex"
                aria-label={isDesktopSidebarVisible ? "Contraer navegación" : "Expandir navegación"}
                onClick={() => setIsDesktopSidebarVisible((prev) => !prev)}
              >
                <span className="material-symbols-outlined">
                  {isDesktopSidebarVisible ? "chevron_left" : "menu"}
                </span>
              </button>
              <div className="hidden items-center gap-2 sm:flex">
                <select className="block w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                  <option>Año Lectivo 2024</option>
                  <option>Año Lectivo 2023</option>
                </select>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <select className="block w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]">
                  <option>Período 1</option>
                  <option>Período 2</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative hidden w-64 sm:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                  search
                </span>
                <input
                  className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--card-light)] pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--primary)] focus:outline-none dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)]"
                  type="search"
                  placeholder="Buscar estudiante, grupo..."
                />
              </div>
              <button className="rounded-full p-2.5 text-[var(--muted-light)] transition-colors hover:bg-[rgba(21,53,147,0.1)] hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-[var(--muted-dark)] dark:hover:bg-[rgba(21,53,147,0.2)] dark:hover:text-[var(--primary)]">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="hidden rounded-full p-2.5 text-[var(--muted-light)] transition-colors hover:bg-[rgba(21,53,147,0.1)] hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:text-[var(--muted-dark)] dark:hover:bg-[rgba(21,53,147,0.2)] dark:hover:text-[var(--primary)] sm:inline-flex">
                <span className="material-symbols-outlined">help_outline</span>
              </button>
              <div
                className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-[var(--primary)] bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBXKY0aWClwmlwPZuyc0MzFDQ8VHmXtuxXoulGBFQCjs1ZES2JLjVJ2ay3lFGMizmb6N4JbxTAa-0imh1aweH28l1AZjm1K_AXzy9VikH1m8MzIYmMcGRkwp6tTyaBcImKc0B0ag3xo8qjMI55Sxv4MASVpKER_2NZjrn5Ib8a74MLhLfpSbh_itlPn0-B2OkwpOcvKT3T7zQB6rPFK2t8TJiVuyfVD_r9I7PXKFB9ytVqzQxJkLPROlxNUna2pmgyWYvzsWuUvrDg')",
                }}
              />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-[var(--background-light)] p-6 sm:p-8 dark:bg-[var(--background-dark)]">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
