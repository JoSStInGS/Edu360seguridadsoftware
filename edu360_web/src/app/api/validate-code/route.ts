import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const { center, code, role } = await request.json();

        if (!center || !code || !role) {
            return NextResponse.json(
                { error: "Faltan datos requeridos" },
                { status: 400 }
            );
        }

        const db = getAdminFirestore();
        // Assuming the document ID for the center is the center name as per user description
        const codeRef = db
            .collection("centers")
            .doc(center)
            .collection("register_codes")
            .doc(code);

        const doc = await codeRef.get();

        if (!doc.exists) {
            return NextResponse.json(
                { valid: false, message: "Código inválido" },
                { status: 200 }
            );
        }

        const data = doc.data();

        if (!data) {
            return NextResponse.json(
                { valid: false, message: "Error al leer datos del código" },
                { status: 200 }
            );
        }

        // Validate Role
        if (data.role !== role) {
            return NextResponse.json(
                { valid: false, message: "El rol no coincide con el código proporcionado" },
                { status: 200 }
            );
        }

        // Validate Expiration
        if (data.expires_at) {
            const expiresAt = data.expires_at instanceof Timestamp ? data.expires_at.toDate() : new Date(data.expires_at);
            const now = new Date();
            if (now > expiresAt) {
                return NextResponse.json(
                    { valid: false, message: "El código ha expirado" },
                    { status: 200 }
                );
            }
        }

        // If all checks pass
        return NextResponse.json({
            valid: true,
            message: "Código válido",
            profesorId: data.profesorId || null,
            periodId: data.periodId || null,
        });

    } catch (error) {
        console.error("Error validating code:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
