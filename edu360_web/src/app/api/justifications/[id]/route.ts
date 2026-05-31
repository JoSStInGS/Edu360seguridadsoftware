import { NextResponse } from "next/server";
import { getAdminFirestore, ensureAdminApp } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import type { JustificationDecision, AbsenceJustification } from "@/types/justification";
import { recalculateStatus } from "@/types/justification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeProfessorComment(comment: string | undefined) {
    if (!comment) return undefined;

    const sanitized = comment
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);

    return sanitized || undefined;
}

/**
 * PATCH /api/justifications/{id}
 * Profesor aprueba o rechaza su decisión para una clase específica.
 *
 * Body:
 * {
 *   periodId: string;
 *   scheduleId: string;
 *   decision: 'approved' | 'rejected';
 *   comment?: string;
 * }
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }
        const idToken = authHeader.split("Bearer ")[1];

        const app = ensureAdminApp();
        const auth = getAuth(app);
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const db = getAdminFirestore();
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const userData = userDoc.data()!;
        const centerId = userData.centerId as string;
        if (!centerId) {
            return NextResponse.json({ error: "Usuario sin centro asociado" }, { status: 400 });
        }

        const body = await request.json();
        const { periodId, scheduleId, decision, comment } = body as {
            periodId: string;
            scheduleId: string;
            decision: 'approved' | 'rejected';
            comment?: string;
        };

        if (!periodId || !scheduleId || !decision) {
            return NextResponse.json({ error: "periodId, scheduleId y decision son requeridos" }, { status: 400 });
        }
        if (decision !== 'approved' && decision !== 'rejected') {
            return NextResponse.json({ error: "decision debe ser 'approved' o 'rejected'" }, { status: 400 });
        }

        // Resolve teacherDocId
        let teacherDocId = userData.profesorId as string | undefined;
        const email = userData.email as string | undefined;

        if (!teacherDocId && email) {
            const profSnap = await db
                .collection("centers").doc(centerId)
                .collection("periods").doc(periodId)
                .collection("profesores")
                .where("email", "==", email)
                .limit(1)
                .get();

            if (!profSnap.empty) {
                teacherDocId = profSnap.docs[0].id;
            }
        }

        if (!teacherDocId) {
            return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 });
        }

        // Fetch the justification document
        const justRef = db
            .collection("centers").doc(centerId)
            .collection("periods").doc(periodId)
            .collection("absence_justifications")
            .doc(id);

        const justDoc = await justRef.get();
        if (!justDoc.exists) {
            return NextResponse.json({ error: "Justificación no encontrada" }, { status: 404 });
        }

        const justData = { id: justDoc.id, ...justDoc.data() } as AbsenceJustification;

        const targetDecision = justData.decisions.find(
            (d) => d.scheduleId === scheduleId && d.profesorId === teacherDocId
        );

        if (!targetDecision) {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
        }

        if (targetDecision.status !== 'pending') {
            return NextResponse.json({ error: "La decisión ya fue revisada" }, { status: 409 });
        }

        const profesorComment = sanitizeProfessorComment(comment);

        // Find and update the matching decision
        const now = new Date().toISOString();
        const updatedDecisions: JustificationDecision[] = justData.decisions.map((d) => {
            if (d.scheduleId === scheduleId && d.profesorId === teacherDocId) {
                return {
                    ...d,
                    status: decision,
                    profesorComment,
                    reviewedAt: now,
                };
            }
            return d;
        });

        // Recalculate global status
        const newStatus = recalculateStatus(updatedDecisions);

        // Remove this professor from pendingProfessorIds (if all their decisions are resolved)
        const professorStillPending = updatedDecisions.some(
            (d) => d.profesorId === teacherDocId && d.status === 'pending'
        );

        await justRef.update({
            decisions: updatedDecisions,
            status: newStatus,
            pendingProfessorIds: professorStillPending
                ? justData.pendingProfessorIds // keep as-is
                : justData.pendingProfessorIds.filter((id) => id !== teacherDocId),
            updatedAt: now,
        });

        return NextResponse.json({ ok: true, status: newStatus });
    } catch (error) {
        console.error("Error updating justification:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
