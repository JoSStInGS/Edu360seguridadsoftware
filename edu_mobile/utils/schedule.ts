import type { ScheduleEntry } from '@/types';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SHORT_DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Obtiene el nombre del día actual.
 */
export function getCurrentDayName(): string {
  return DAY_NAMES[new Date().getDay()];
}

/**
 * Obtiene el índice del día actual (0=Lunes, 4=Viernes).
 * Retorna -1 para fines de semana.
 */
export function getCurrentDayIndex(): number {
  const jsDay = new Date().getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
  if (jsDay === 0 || jsDay === 6) return -1;
  return jsDay - 1; // 0=Lun, 1=Mar, ..., 4=Vie
}

/**
 * Obtiene las clases del día actual.
 */
export function getTodayClasses(schedule: ScheduleEntry[]): ScheduleEntry[] {
  const dayIndex = getCurrentDayIndex();
  if (dayIndex === -1) return [];
  return schedule
    .filter((entry) => entry.diaIndex === dayIndex)
    .sort((a, b) => a.periodo - b.periodo);
}

/**
 * Obtiene la clase actual según la hora.
 */
export function getCurrentClass(
  schedule: ScheduleEntry[]
): ScheduleEntry | null {
  const todayClasses = getTodayClasses(schedule);
  if (todayClasses.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const entry of todayClasses) {
    const [startH, startM] = entry.horaInicio.split(':').map(Number);
    const [endH, endM] = entry.horaFin.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return entry;
    }
  }

  return null;
}

/**
 * Obtiene la próxima clase del día.
 */
export function getNextClass(
  schedule: ScheduleEntry[]
): ScheduleEntry | null {
  const todayClasses = getTodayClasses(schedule);
  if (todayClasses.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const entry of todayClasses) {
    const [startH, startM] = entry.horaInicio.split(':').map(Number);
    const startMinutes = startH * 60 + startM;

    if (currentMinutes < startMinutes) {
      return entry;
    }
  }

  return null;
}

/**
 * Agrupa el horario por día de la semana.
 */
export function groupScheduleByDay(
  schedule: ScheduleEntry[]
): Record<number, ScheduleEntry[]> {
  const grouped: Record<number, ScheduleEntry[]> = {};

  for (const entry of schedule) {
    if (!grouped[entry.diaIndex]) {
      grouped[entry.diaIndex] = [];
    }
    grouped[entry.diaIndex].push(entry);
  }

  // Ordenar cada día por periodo
  for (const day of Object.keys(grouped)) {
    grouped[Number(day)].sort((a, b) => a.periodo - b.periodo);
  }

  return grouped;
}

/**
 * Retorna el nombre corto del día por índice (0=Lun).
 */
export function getDayShortName(dayIndex: number): string {
  return SHORT_DAY_NAMES[dayIndex + 1] ?? '';
}

/**
 * Retorna el nombre del día por índice (0=Lunes).
 */
export function getDayName(dayIndex: number): string {
  return DAY_NAMES[dayIndex + 1] ?? '';
}

/**
 * Formatea la hora para mostrar (ej: "8:00" -> "8:00 AM").
 */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD.
 */
export function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}
