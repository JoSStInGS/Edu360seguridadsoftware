import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";

function normalizeRolesServer(data: Record<string, unknown> | undefined): string[] {
    if (!data) return [];
    if (Array.isArray(data.roles) && data.roles.length > 0) return data.roles.filter((r: unknown) => typeof r === "string");
    if (typeof data.role === "string" && data.role) return [data.role];
    return [];
}

async function verifyUser(request: Request) {
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

    const userData = userDoc.data()!;
    const roles = normalizeRolesServer(userData);

    if (!roles.includes("admin") && !roles.includes("professor")) {
        return { error: "Acceso denegado", status: 403 };
    }

    const centerId = userData.centerId as string;
    if (!centerId) {
        return { error: "Usuario sin centro asociado", status: 400 };
    }

    return { uid, centerId, roles, userData, db };
}

// GET: List teacher absences
export async function GET(request: Request) {
    try {
        const result = await verifyUser(request);
        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { centerId, db } = result;
        const { searchParams } = new URL(request.url);
        const periodId = searchParams.get("period");
        const profesorId = searchParams.get("profesorId");
        const date = searchParams.get("date");
        const status = searchParams.get("status");

        if (!periodId) {
            return NextResponse.json({ error: "period es requerido" }, { status: 400 });
        }

        const absencesRef = db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("teacher_absences");

        let query: FirebaseFirestore.Query = absencesRef;

        // Filter by status (default: active)
        const filterStatus = status || "active";
        query = query.where("status", "==", filterStatus);

        if (profesorId) {
            query = query.where("profesorId", "==", profesorId);
        }

        // If filtering by date: get absences where endDate >= date, then filter client-side
        if (date) {
            query = query.where("endDate", ">=", date);
        }

        const snapshot = await query.orderBy("endDate", "asc").limit(200).get();

        let absences = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Client-side filter: startDate <= date
        if (date) {
            absences = absences.filter((a: Record<string, unknown>) => (a.startDate as string) <= date);
        }

        return NextResponse.json({ absences });
    } catch (error) {
        console.error("Error fetching teacher absences:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// POST: Create a teacher absence (admin only)
export async function POST(request: Request) {
    try {
        const result = await verifyUser(request);
        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { uid, centerId, roles, db } = result;

        if (!roles.includes("admin")) {
            return NextResponse.json({ error: "Solo administradores pueden crear ausencias" }, { status: 403 });
        }

        const body = await request.json();
        const {
            periodId,
            profesorId,
            profesorNombre,
            startDate,
            endDate,
            reason,
            substituteProfesorId,
            substituteProfesorNombre,
        } = body;

        // Validations
        if (!periodId || !profesorId || !profesorNombre || !startDate || !endDate || !reason?.trim()) {
            return NextResponse.json({ error: "Datos incompletos. Todos los campos obligatorios son requeridos." }, { status: 400 });
        }

        if (startDate > endDate) {
            return NextResponse.json({ error: "La fecha de inicio no puede ser posterior a la fecha de fin" }, { status: 400 });
        }

        // Check for overlapping active absences
        const absencesRef = db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("teacher_absences");

        const overlapQuery = absencesRef
            .where("status", "==", "active")
            .where("profesorId", "==", profesorId)
            .where("endDate", ">=", startDate);

        const overlapSnap = await overlapQuery.get();
        const overlapping = overlapSnap.docs.filter((doc) => {
            const data = doc.data();
            return data.startDate <= endDate;
        });

        if (overlapping.length > 0) {
            return NextResponse.json({
                error: "Ya existe una ausencia activa que se solapa con el rango de fechas indicado"
            }, { status: 409 });
        }

        const now = new Date().toISOString();
        const absenceData: Record<string, unknown> = {
            profesorId,
            profesorNombre,
            startDate,
            endDate,
            reason: reason.trim(),
            status: "active",
            createdBy: uid,
            createdAt: now,
            updatedAt: now,
        };

        if (substituteProfesorId) {
            absenceData.substituteProfesorId = substituteProfesorId;
            absenceData.substituteProfesorNombre = substituteProfesorNombre || "";
        }

        const docRef = await absencesRef.add(absenceData);

        return NextResponse.json({
            success: true,
            id: docRef.id,
            absence: { id: docRef.id, ...absenceData },
        });
    } catch (error) {
        console.error("Error creating teacher absence:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// PATCH: Update/cancel a teacher absence (admin only)
export async function PATCH(request: Request) {
    try {
        const result = await verifyUser(request);
        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { centerId, roles, db } = result;

        if (!roles.includes("admin")) {
            return NextResponse.json({ error: "Solo administradores pueden modificar ausencias" }, { status: 403 });
        }

        const body = await request.json();
        const { absenceId, periodId, ...updates } = body;

        if (!absenceId || !periodId) {
            return NextResponse.json({ error: "absenceId y periodId son requeridos" }, { status: 400 });
        }

        const absenceRef = db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("teacher_absences")
            .doc(absenceId);

        const absenceDoc = await absenceRef.get();
        if (!absenceDoc.exists) {
            return NextResponse.json({ error: "Ausencia no encontrada" }, { status: 404 });
        }

        const allowedFields = ["status", "reason", "endDate", "substituteProfesorId", "substituteProfesorNombre"];
        const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateData[field] = updates[field];
            }
        }

        // Validate status transition
        if (updateData.status && !["active", "cancelled"].includes(updateData.status as string)) {
            return NextResponse.json({ error: "Status inválido" }, { status: 400 });
        }

        await absenceRef.update(updateData);

        const updated = await absenceRef.get();
        return NextResponse.json({
            success: true,
            absence: { id: updated.id, ...updated.data() },
        });
    } catch (error) {
        console.error("Error updating teacher absence:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
