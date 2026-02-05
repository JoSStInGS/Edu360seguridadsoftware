"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { logout } from "@/app/auth/services/auth";
import CustomSelect from "@/app/components/CustomSelect";
import { useFetchPeriods } from "@/app/hooks/useFetchPeriods";
import { usePeriodStore } from "@/app/stores/usePeriodStore";

const NAV_ITEMS = [
  { label: "Inicio", icon: "home", href: "/dashboard" },
  { label: "Estudiantes", icon: "group", href: "/dashboard/students" },
  { label: "Profesores", icon: "school", href: "/dashboard/teachers" },
  { label: "Grupos/Secciones", icon: "groups", href: "#" },
  { label: "Asistencia", icon: "event_available", href: "#" },
  { label: "Reportes", icon: "monitoring", href: "#" },
  { label: "Configuración", icon: "settings", href: "#" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Fetch periods globally
  useFetchPeriods();
  const { periods, selectedPeriod, setSelectedPeriod, isLoading } = usePeriodStore();

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
          <svg
            className="h-8 w-8 text-primary"
            fill="none"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z"
              fill="currentColor"
            />
          </svg>
          <h1 className="text-2xl font-bold">EDU360</h1>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive =
              item.href !== "#" &&
              (item.href === "/dashboard"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`));

            const baseClasses =
              "flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors text-xs";
            const activeClasses = isActive
              ? "bg-[rgba(21,53,147,0.1)] text-[var(--primary)] dark:bg-[rgba(21,53,147,0.2)]"
              : "text-[var(--muted-light)] hover:bg-[rgba(21,53,147,0.1)] hover:text-[var(--primary)] dark:text-[var(--muted-dark)] dark:hover:bg-[rgba(21,53,147,0.2)] dark:hover:text-[var(--primary)]";

            if (item.href === "#") {
              return (
                <span
                  key={item.label}
                  className={`${baseClasses} text-[var(--muted-light)] dark:text-[var(--muted-dark)]`}
                >
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

          <div className="my-2 border-t border-[rgba(21,53,147,0.1)] dark:border-[rgba(255,255,255,0.1)]" />

          <Link
            href="/dashboard/schedules/import"
            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors text-xs ${pathname === "/dashboard/schedules/import"
                ? "bg-[rgba(21,53,147,0.1)] text-[var(--primary)] dark:bg-[rgba(21,53,147,0.2)]"
                : "text-[var(--muted-light)] hover:bg-[rgba(21,53,147,0.1)] hover:text-[var(--primary)] dark:text-[var(--muted-dark)] dark:hover:bg-[rgba(21,53,147,0.2)] dark:hover:text-[var(--primary)]"
              }`}
            onClick={onNavigate}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="font-semibold">Importar Horarios</span>
          </Link>
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
          className={`hidden ${isDesktopSidebarVisible ? "lg:flex" : "lg:hidden"
            } fixed inset-y-0 left-0 w-64 z-30 flex-col justify-between border-r border-[var(--border-light)] bg-[var(--card-light)] p-6 dark:border-[var(--border-dark)] dark:bg-[var(--card-dark)] transition-transform duration-200`}
        >
          {renderSidebarContent()}
        </aside>

        <div
          className={`flex flex-1 flex-col ${isDesktopSidebarVisible ? "lg:ml-64" : ""
            }`}
          style={{ minWidth: 0 }}
        >
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[rgba(21,53,147,0.1)] dark:border-border-dark bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm px-2">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                className="p-2 rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-primary transition-colors lg:hidden"
                aria-label={isMobileSidebarOpen ? "Cerrar menú" : "Abrir menú"}
                onClick={() => setIsMobileSidebarOpen((v) => !v)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>

              {/* Desktop toggle button */}
              <button
                className="p-2 rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-primary transition-colors hidden lg:inline-flex"
                aria-label={
                  isDesktopSidebarVisible ? "Ocultar menú" : "Mostrar menú"
                }
                onClick={() => setIsDesktopSidebarVisible((v) => !v)}
              >
                <span className="material-symbols-outlined">
                  {isDesktopSidebarVisible ? "chevron_left" : "menu"}
                </span>
              </button>

              <CustomSelect
                availableKeys={periods.length > 0 ? periods : (isLoading ? ["Cargando..."] : ["Sin periodos"])}
                value={selectedPeriod || (isLoading ? "Cargando..." : "Sin periodos")}
                onChange={(key) => setSelectedPeriod(key)}
                selectedValueClassName="text-center"
                optionClassName="text-center"
              />
            </div>

            <div className="flex items-center gap-4 min-w-0">
              <div className="relative w-40 md:w-64 2xl:w-96">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark">
                  search
                </span>
                <input
                  className="w-full rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Buscar estudiante, grupo..."
                  type="search"
                />
              </div>
              <button className="p-2.5 rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 text-muted-light dark:text-muted-dark hover:text-primary dark:hover:text-primary transition-colors">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <Image
                alt="User avatar"
                className="h-10 w-10 rounded-full border-2 border-primary"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXKY0aWClwmlwPZuyc0MzFDQ8VHmXtuxXoulGBFQCjs1ZES2JLjVJ2ay3lFGMizmb6N4JbxTAa-0imh1aweH28l1AZjm1K_AXzy9VikH1m8MzIYmMcGRkwp6tTyaBcImKc0B0ag3xo8qjMI55Sxv4MASVpKER_2NZjrn5Ib8a74MLhLfpSbh_itlPn0-B2OkwpOcvKT3T7zQB6rPFK2t8TJiVuyfVD_r9I7PXKFB9ytVqzQxJkLPROlxNUna2pmgyWYvzsWuUvrDg"
                width={40}
                height={40}
              />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-[var(--background-light)] p-4 md:p-6 2xl:p-8 dark:bg-[var(--background-dark)]">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
