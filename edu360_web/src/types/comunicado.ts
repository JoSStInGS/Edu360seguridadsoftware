export interface Comunicado {
    id?: string;
    profesorId: string;
    profesorNombre: string;
    studentCedula: string;
    studentName: string;
    grupoId: string;
    grupoNombre: string;
    subject: string;
    message: string;
    createdAt: string;
    readBy: string[];
}
