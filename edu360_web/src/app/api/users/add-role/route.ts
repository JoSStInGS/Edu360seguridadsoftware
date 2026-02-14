import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/app/lib/firebaseAdmin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

function normalizeRolesServer(data: Record<string, unknown> | undefined): string[] {
    if (!data) return [];
    if (Array.isArray(data.roles) && data.roles.length > 0) return data.roles.filter((r: unknown) => typeof r === "string");
    if (typeof data.role === "string" && data.role) return [data.role];
    return [];
}

export async function POST(request: Request) {
    try {
        // Verify auth
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

        const currentRoles = normalizeRolesServer(userData);

        // Parse body
        const { code } = await request.json();
        if (!code) {
            return NextResponse.json({ error: "Codigo es requerido" }, { status: 400 });
        }

        // Validate code
        const codeRef = db.collection("centers").doc(centerId).collection("register_codes").doc(code);
        const codeDoc = await codeRef.get();

        if (!codeDoc.exists) {
            return NextResponse.json({ error: "Codigo invalido" }, { status: 400 });
        }

        const codeData = codeDoc.data()!;

        // Check if already used
        if (codeData.used) {
            return NextResponse.json({ error: "Este codigo ya fue utilizado" }, { status: 400 });
        }

        // Check expiration
        if (codeData.expires_at) {
            const expiresAt = codeData.expires_at instanceof Timestamp
                ? codeData.expires_at.toDate()
                : new Date(codeData.expires_at);
            if (new Date() > expiresAt) {
                return NextResponse.json({ error: "El codigo ha expirado" }, { status: 400 });
            }
        }

        const newRole = codeData.role as string;
        if (!newRole || !["admin", "professor", "parent"].includes(newRole)) {
            return NextResponse.json({ error: "Rol del codigo invalido" }, { status: 400 });
        }

        // Check if user already has this role
        if (currentRoles.includes(newRole)) {
            return NextResponse.json({ error: "Ya tienes este rol asignado" }, { status: 400 });
        }

        // Add role to user
        const updateData: Record<string, unknown> = {
            roles: FieldValue.arrayUnion(newRole),
            updatedAt: new Date().toISOString(),
        };

        // If professor: link profesorId
        if (newRole === "professor" && codeData.profesorId) {
            updateData.profesorId = codeData.profesorId;

            // Also link email in profesores collection
            if (codeData.periodId) {
                const profRef = db
                    .collection("centers").doc(centerId)
                    .collection("periods").doc(codeData.periodId)
                    .collection("profesores").doc(codeData.profesorId);
                const profDoc = await profRef.get();
                if (profDoc.exists) {
                    await profRef.update({ email: userData.email || decodedToken.email });
                }
            }
        }

        // If parent: create parent-student links
        if (newRole === "parent" && codeData.studentCedulas && codeData.periodId) {
            const parentStudentsRef = db
                .collection("centers").doc(centerId)
                .collection("periods").doc(codeData.periodId)
                .collection("parent_students");

            for (const cedula of codeData.studentCedulas) {
                const linkId = `${uid}_${cedula}`;
                // Get student name
                const studentRef = db
                    .collection("centers").doc(centerId)
                    .collection("periods").doc(codeData.periodId)
                    .collection("students").doc(cedula);
                const studentDoc = await studentRef.get();
                const studentData = studentDoc.data();
                const studentName = studentData?.fullName ||
                    [studentData?.name, studentData?.lastName1, studentData?.lastName2].filter(Boolean).join(" ") ||
                    "Sin nombre";

                await parentStudentsRef.doc(linkId).set({
                    parentUid: uid,
                    parentEmail: userData.email || decodedToken.email,
                    studentCedula: cedula,
                    studentName,
                    grupoId: studentData?.grupoId || null,
                    grupoNombre: studentData?.grupoNombre || null,
                    createdAt: new Date().toISOString(),
                });
            }
        }

        await db.collection("users").doc(uid).update(updateData);

        // Mark code as used
        await codeRef.update({
            used: true,
            usedBy: uid,
            usedAt: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            newRole,
            roles: [...currentRoles, newRole],
        });
    } catch (error) {
        console.error("Error adding role:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
