import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";

function normalizeRolesServer(data: Record<string, unknown> | undefined): string[] {
    if (!data) return [];
    if (Array.isArray(data.roles) && data.roles.length > 0) {
        return data.roles.filter((r: unknown) => typeof r === "string");
    }
    if (typeof data.role === "string" && data.role) {
        return [data.role];
    }
    return [];
}

async function verifyAdmin(request: Request) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return { error: "No autorizado", status: 401 };
    }
    const idToken = authHeader.split("Bearer ")[1];

    const app = ensureAdminApp();
    const auth = getAuth(app);
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const db = getAdminFirestore();
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
        return { error: "Usuario no encontrado", status: 404 };
    }

    const userData = userDoc.data();
    const roles = normalizeRolesServer(userData);
    if (!roles.includes("admin")) {
        return { error: "Acceso denegado", status: 403 };
    }

    const centerId = userData?.centerId;
    if (!centerId) {
        return { error: "Usuario sin centro asociado", status: 400 };
    }

    return { uid, centerId, db };
}

export async function GET(request: Request) {
    try {
        const result = await verifyAdmin(request);
        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { centerId, db } = result;

        // Fetch all users belonging to this center
        const usersSnap = await db
            .collection("users")
            .where("centerId", "==", centerId)
            .get();

        // Enrich with Firebase Auth data (email, displayName)
        const app = ensureAdminApp();
        const authAdmin = getAuth(app);

        const users = await Promise.all(
            usersSnap.docs.map(async (doc) => {
                const data = doc.data();
                let email = data.email || null;
                let displayName = data.displayName || data.name || null;

                // Try to get email/displayName from Firebase Auth if not in Firestore
                if (!email || !displayName) {
                    try {
                        const authUser = await authAdmin.getUser(doc.id);
                        if (!email) email = authUser.email || null;
                        if (!displayName) displayName = authUser.displayName || null;
                    } catch {
                        // User may not exist in Auth anymore
                    }
                }

                const roles = normalizeRolesServer(data);
                return {
                    uid: doc.id,
                    email,
                    displayName,
                    roles,
                    status: data.status || "active",
                    centerId: data.centerId,
                    centerName: data.centerName || null,
                    profesorId: data.profesorId || null,
                    createdAt: data.createdAt || data.updatedAt || null,
                };
            })
        );

        // Calculate metrics
        const metrics = {
            total: users.length,
            admins: users.filter((u) => u.roles.includes("admin")).length,
            professors: users.filter((u) => u.roles.includes("professor")).length,
            parents: users.filter((u) => u.roles.includes("parent")).length,
        };

        return NextResponse.json({ users, metrics });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const result = await verifyAdmin(request);
        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { centerId, db } = result;
        const { targetUid, roles, status } = await request.json();

        if (!targetUid) {
            return NextResponse.json({ error: "targetUid es requerido" }, { status: 400 });
        }

        // Verify target user belongs to same center
        const targetDoc = await db.collection("users").doc(targetUid).get();
        if (!targetDoc.exists) {
            return NextResponse.json({ error: "Usuario objetivo no encontrado" }, { status: 404 });
        }

        const targetData = targetDoc.data();
        if (targetData?.centerId !== centerId) {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }

        const updateData: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
        };

        const validRoles = ["admin", "professor", "parent"];
        if (Array.isArray(roles) && roles.length > 0 && roles.every((r: string) => validRoles.includes(r))) {
            
            // CORRECCIÓN 1: Verificar que no se quita el último admin activo del centro
            const currentRoles = normalizeRolesServer(targetData);
            const isRemovingAdmin = currentRoles.includes("admin") && !roles.includes("admin");

            if (isRemovingAdmin) {
                const adminsSnap = await db
                    .collection("users")
                    .where("centerId", "==", centerId)
                    .where("status", "==", "active")
                    .get();

                const activeAdmins = adminsSnap.docs.filter((doc) => {
                    const data = doc.data();
                    const docRoles = normalizeRolesServer(data);
                    return docRoles.includes("admin") && doc.id !== targetUid;
                });

                if (activeAdmins.length === 0) {
                    return NextResponse.json(
                        { error: "No se puede quitar el rol admin al último administrador activo del centro." },
                        { status: 400 }
                    );
                }
            }

            updateData.roles = roles;
        }

        if (status && ["active", "inactive"].includes(status)) {
            // CORRECCIÓN 2: Verificar que no se desactiva el último admin activo
            const currentRoles = normalizeRolesServer(targetData);
            const isDeactivatingAdmin = currentRoles.includes("admin") && status === "inactive";

            if (isDeactivatingAdmin) {
                const adminsSnap = await db
                    .collection("users")
                    .where("centerId", "==", centerId)
                    .where("status", "==", "active")
                    .get();

                const activeAdmins = adminsSnap.docs.filter((doc) => {
                    const data = doc.data();
                    const docRoles = normalizeRolesServer(data);
                    return docRoles.includes("admin") && doc.id !== targetUid;
                });

                if (activeAdmins.length === 0) {
                    return NextResponse.json(
                        { error: "No se puede desactivar al último administrador activo del centro." },
                        { status: 400 }
                    );
                }
            }

            updateData.status = status;
        }

        await db.collection("users").doc(targetUid).update(updateData);

        // CORRECCIÓN 3: Registrar auditoría del cambio
        await db.collection("centers").doc(centerId).collection("audit_logs").add({
            action: "user_updated",
            targetUid,
            changes: { roles, status },
            performedBy: result.uid,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const result = await verifyAdmin(request);
        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { centerId, db } = result;
        const { searchParams } = new URL(request.url);
        const targetUid = searchParams.get("uid");

        if (!targetUid) {
            return NextResponse.json({ error: "uid es requerido" }, { status: 400 });
        }

        // Verify target user belongs to same center
        const targetDoc = await db.collection("users").doc(targetUid).get();
        if (!targetDoc.exists) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const targetData = targetDoc.data();
        if (targetData?.centerId !== centerId) {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }

        // Soft-delete: set status to inactive
        await db.collection("users").doc(targetUid).update({
            status: "inactive",
            updatedAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deactivating user:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
