export interface Teacher {
    id: string;
    photoUrl: string;
    firstName: string;
    lastName?: string; // Keeping for backward compatibility if needed, but we should use lastName1 and lastName2
    lastName1?: string;
    lastName2?: string;
    email?: string; // Made optional as it might not be in the CSV
    type: string; // Changed to string to allow imported values
    area: string;
    assignedCourses?: number;
    status: string; // Changed to string to allow imported values
}
