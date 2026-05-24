interface UserMetrics {
    total: number;
    admins: number;
    professors: number;
    parents: number;
}

interface UserMetricsCardsProps {
    metrics: UserMetrics;
}

const cards = [
    { label: "Total Usuarios", key: "total" as const, icon: "group", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Administradores", key: "admins" as const, icon: "admin_panel_settings", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { label: "Profesores", key: "professors" as const, icon: "school", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "Encargados legales", key: "parents" as const, icon: "family_restroom", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
];

export default function UserMetricsCards({ metrics }: UserMetricsCardsProps) {
    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map((card) => (
                <Card key={card.key} className="p-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                            <span className={`material-symbols-outlined text-xl ${card.color}`}>
                                {card.icon}
                            </span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--foreground-light)] dark:text-[var(--foreground-dark)]">
                                {metrics[card.key]}
                            </p>
                            <p className="text-xs text-[var(--muted-light)] dark:text-[var(--muted-dark)]">
                                {card.label}
                            </p>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
import { Card } from "@/app/components/ui";
