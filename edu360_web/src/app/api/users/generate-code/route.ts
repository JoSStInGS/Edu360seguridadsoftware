import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { ensureAdminApp } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";

function generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
    try {
        // 1. Verify Bearer token
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

        // 2. Verify user is admin
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const userData = userDoc.data();
        console.log("user data: ", userData)
        if (userData?.role !== "admin") {
            return NextResponse.json({ error: "Acceso denegado. Se requiere rol de administrador." }, { status: 403 });
        }

        const centerId = userData?.centerId;
        if (!centerId) {
            return NextResponse.json({ error: "Usuario sin centro asociado" }, { status: 400 });
        }

        // 3. Parse body
        const { role, profesorId, periodId } = await request.json();

        if (!role || !["professor", "admin", "parent"].includes(role)) {
            return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
        }

        // 4. Generate unique 6-digit code
        const codesRef = db.collection("centers").doc(centerId).collection("register_codes");
        let code = generateSixDigitCode();
        let attempts = 0;

        while (attempts < 10) {
            const existing = await codesRef.doc(code).get();
            if (!existing.exists) break;
            code = generateSixDigitCode();
            attempts++;
        }

        if (attempts >= 10) {
            return NextResponse.json({ error: "No se pudo generar un código único" }, { status: 500 });
        }

        // 5. Save code with 15-minute expiration
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

        const codeData: Record<string, unknown> = {
            role,
            expires_at: expiresAt,
            createdAt: now,
            used: false,
            usedBy: null,
            createdBy: uid,
        };

        if (role === "professor" && profesorId) {
            codeData.profesorId = profesorId;
            if (periodId) {
                codeData.periodId = periodId;
            }
        }

        await codesRef.doc(code).set(codeData);

        return NextResponse.json({
            code,
            expiresAt: expiresAt.toISOString(),
        });
    } catch (error) {
        console.error("Error generating code:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
