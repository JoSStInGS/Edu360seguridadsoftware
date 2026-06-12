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
        const codeRef = db
            .collection("centers")
            .doc(center)
            .collection("register_codes")
            .doc(code);

        const doc = await codeRef.get();

        // CORRECCIÓN 1: Usar mensaje genérico para todos los errores de validación
        // Antes se usaban mensajes diferentes para cada tipo de error, lo que
        // permitía enumerar si un código existía, expiró o era de otro rol
        if (!doc.exists) {
            return NextResponse.json(
                { valid: false, message: "Código no válido" },
                { status: 200 }
            );
        }

        const data = doc.data();

        if (!data) {
            return NextResponse.json(
                { valid: false, message: "Código no válido" },
                { status: 200 }
            );
        }

        // CORRECCIÓN 2: Mismo mensaje genérico para rol incorrecto
        if (data.role !== role) {
            return NextResponse.json(
                { valid: false, message: "Código no válido" },
                { status: 200 }
            );
        }

        // CORRECCIÓN 3: Mismo mensaje genérico para código expirado
        if (data.expires_at) {
            const expiresAt = data.expires_at instanceof Timestamp
                ? data.expires_at.toDate()
                : new Date(data.expires_at);
            const now = new Date();
            if (now > expiresAt) {
                return NextResponse.json(
                    { valid: false, message: "Código no válido" },
                    { status: 200 }
                );
            }
        }

        // CORRECCIÓN 4: No devolver datos sensibles en la respuesta
        // Antes se devolvían profesorId, periodId y studentCedulas
        // que exponen información interna del sistema
        return NextResponse.json({
            valid: true,
            message: "Código válido",
        });

    } catch (error) {
        console.error("Error validating code:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}