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

// GET: Fetch attendance records
export async function GET(request: Request) {
    try {
        const result = await verifyUser(request);
        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { centerId, db } = result;
        const { searchParams } = new URL(request.url);
        const periodId = searchParams.get("period");
        const date = searchParams.get("date");
        const profesorId = searchParams.get("profesorId");
        const grupoId = searchParams.get("grupoId");
        const scheduleId = searchParams.get("scheduleId");

        if (!periodId) {
            return NextResponse.json({ error: "period es requerido" }, { status: 400 });
        }

        const attendanceRef = db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("attendance");

        // Helper: normalize old `present: boolean` records to `status`
        function normalizeAttendanceRecords(data: Record<string, any>) {
            if (Array.isArray(data.records)) {
                data.records = data.records.map((r: any) => {
                    if (!('status' in r) && 'present' in r) {
                        return { ...r, status: r.present ? 'presente' : 'ausente' };
                    }
                    return r;
                });
            }
            return data;
        }

        // If looking for a specific record
        if (grupoId && date && scheduleId) {
            const docId = `${grupoId}_${date}_${scheduleId}`;
            const doc = await attendanceRef.doc(docId).get();
            if (!doc.exists) {
                return NextResponse.json({ record: null });
            }
            return NextResponse.json({ record: normalizeAttendanceRecords({ id: doc.id, ...doc.data()! }) });
        }

        // Otherwise, query with filters
        let query: FirebaseFirestore.Query = attendanceRef;

        if (date) {
            query = query.where("date", "==", date);
        }
        if (profesorId) {
            query = query.where("profesorId", "==", profesorId);
        }
        if (grupoId) {
            query = query.where("grupoId", "==", grupoId);
        }

        const snapshot = await query.orderBy("date", "desc").limit(100).get();
        const records = snapshot.docs.map((doc) => normalizeAttendanceRecords({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ records });
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// POST: Save attendance (professor only)
export async function POST(request: Request) {
    try {
        const result = await verifyUser(request);
        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { centerId, roles, db } = result;

        if (!roles.includes("professor")) {
            return NextResponse.json({ error: "Solo profesores pueden registrar asistencia" }, { status: 403 });
        }

        const body = await request.json();
        const { periodId, scheduleId, grupoId, grupoNombre, profesorId, date, records, horaInicio } = body;

        if (!periodId || !scheduleId || !grupoId || !profesorId || !date || !records) {
            return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }

        // Time restriction: class must have started
        if (horaInicio) {
            const now = new Date();
            const [hours, minutes] = horaInicio.split(":").map(Number);
            const classStart = new Date();
            classStart.setHours(hours, minutes, 0, 0);

            if (now < classStart) {
                return NextResponse.json({
                    error: "No se puede registrar asistencia antes de que inicie la clase"
                }, { status: 400 });
            }
        }

        const docId = `${grupoId}_${date}_${scheduleId}`;
        const attendanceRef = db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("attendance")
            .doc(docId);

        await attendanceRef.set({
            scheduleId,
            grupoId,
            grupoNombre: grupoNombre || "",
            profesorId,
            date,
            records,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        return NextResponse.json({ success: true, docId });
    } catch (error) {
        console.error("Error saving attendance:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
