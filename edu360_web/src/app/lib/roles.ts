export type UserRole = "admin" | "professor" | "parent";
export type SupabaseRole = "super_admin" | "center_admin" | "professor" | "student" | "guardian";

/**
 * Normalizes user role data to always return a string array.
 * Supports both legacy `role: string` and new `roles: string[]` formats.
 */
export function normalizeRoles(data: Record<string, unknown> | null | undefined): UserRole[] {
    if (!data) return [];

    // New format: roles array
    if (Array.isArray(data.roles) && data.roles.length > 0) {
        return data.roles.filter((r: unknown) => typeof r === "string") as UserRole[];
    }

    // Legacy format: single role string
    if (typeof data.role === "string" && data.role) {
        return [data.role as UserRole];
    }

    return [];
}

export function hasRole(roles: UserRole[], role: UserRole): boolean {
    return roles.includes(role);
}

export function hasAnyRole(roles: UserRole[], check: UserRole[]): boolean {
    return check.some((r) => roles.includes(r));
}

/** Web dashboard is only accessible by admin and professor */
export function canAccessWeb(roles: UserRole[]): boolean {
    return hasAnyRole(roles, ["admin", "professor"]);
}

export function mapSupabaseRole(role: string | null | undefined): UserRole | null {
    switch (role) {
        case "super_admin":
        case "center_admin":
            return "admin";
        case "professor":
            return "professor";
        case "guardian":
        case "student":
            return "parent";
        default:
            return null;
    }
}
