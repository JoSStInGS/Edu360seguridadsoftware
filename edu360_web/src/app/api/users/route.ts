import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";

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
    if (userData?.role !== "admin") {
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

                return {
                    uid: doc.id,
                    email,
                    displayName,
                    role: data.role || "unknown",
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
            admins: users.filter((u) => u.role === "admin").length,
            professors: users.filter((u) => u.role === "professor").length,
            parents: users.filter((u) => u.role === "parent").length,
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
        const { targetUid, role, status } = await request.json();

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

        if (role && ["admin", "professor", "parent"].includes(role)) {
            updateData.role = role;
        }

        if (status && ["active", "inactive"].includes(status)) {
            updateData.status = status;
        }

        await db.collection("users").doc(targetUid).update(updateData);

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
