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

    if (!roles.includes("professor")) {
        return { error: "Solo profesores pueden enviar comunicados", status: 403 };
    }

    const centerId = userData.centerId as string;
    if (!centerId) {
        return { error: "Usuario sin centro asociado", status: 400 };
    }

    return { uid, centerId, roles, userData, db };
}

async function resolveAuthenticatedProfessor(
    db: FirebaseFirestore.Firestore,
    centerId: string,
    periodId: string,
    userData: Record<string, unknown>,
) {
    const profesorId = typeof userData.profesorId === "string" ? userData.profesorId : undefined;
    const email = typeof userData.email === "string" ? userData.email : undefined;

    if (profesorId) {
        const profesorDoc = await db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("profesores").doc(profesorId)
            .get();

        return {
            profesorId,
            profesorNombre: profesorDoc.exists
                ? (profesorDoc.data()?.nombre as string | undefined) || ""
                : "",
        };
    }

    if (!email) {
        return null;
    }

    const profesorSnap = await db
        .collection("centers").doc(centerId)
        .collection("periods").doc(periodId)
        .collection("profesores")
        .where("email", "==", email)
        .limit(1)
        .get();

    if (profesorSnap.empty) {
        return null;
    }

    const profesorDoc = profesorSnap.docs[0];
    return {
        profesorId: profesorDoc.id,
        profesorNombre: (profesorDoc.data().nombre as string | undefined) || "",
    };
}

// POST: Create comunicado
export async function POST(request: Request) {
    try {
        const result = await verifyUser(request);
        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { centerId, db, userData } = result;
        const body = await request.json();
        const { periodId, profesorId, profesorNombre, studentCedula, studentName, grupoId, grupoNombre, subject, message } = body;

        if (!periodId || !studentCedula || !subject?.trim() || !message?.trim()) {
            return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }

        const authenticatedProfessor = await resolveAuthenticatedProfessor(db, centerId, periodId, userData);
        if (!authenticatedProfessor) {
            return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 });
        }

        if (profesorId && profesorId !== authenticatedProfessor.profesorId) {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }

        const comunicadoData = {
            profesorId: authenticatedProfessor.profesorId,
            profesorNombre: authenticatedProfessor.profesorNombre || profesorNombre || "",
            studentCedula,
            studentName: studentName || "",
            grupoId: grupoId || "",
            grupoNombre: grupoNombre || "",
            subject: subject.trim(),
            message: message.trim(),
            createdAt: new Date().toISOString(),
            readBy: [],
        };

        const ref = await db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("comunicados")
            .add(comunicadoData);

        return NextResponse.json({ success: true, id: ref.id });
    } catch (error) {
        console.error("Error creating comunicado:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// GET: List comunicados for professor
export async function GET(request: Request) {
    try {
        const result = await verifyUser(request);
        if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { centerId, db, userData } = result;
        const { searchParams } = new URL(request.url);
        const periodId = searchParams.get("period");
        const profesorId = searchParams.get("profesorId");

        if (!periodId) {
            return NextResponse.json({ error: "period es requerido" }, { status: 400 });
        }

        const authenticatedProfessor = await resolveAuthenticatedProfessor(db, centerId, periodId, userData);
        if (!authenticatedProfessor) {
            return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 });
        }

        if (profesorId && profesorId !== authenticatedProfessor.profesorId) {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }

        const snapshot = await db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("comunicados")
            .where("profesorId", "==", authenticatedProfessor.profesorId)
            .orderBy("createdAt", "desc")
            .limit(50)
            .get();

        const comunicados = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({ comunicados });
    } catch (error) {
        console.error("Error fetching comunicados:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
