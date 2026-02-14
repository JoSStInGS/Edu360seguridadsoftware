import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTeacher } from '@/contexts/TeacherContext';
import { useTheme } from '@/hooks/useTheme';
import {
  getStudentsByGroup,
  saveAttendance,
  getAttendance,
} from '@/services/firestore';
import {
  getCurrentClass,
  getTodayClasses,
  formatTime,
  getTodayDate,
} from '@/utils/schedule';
import type { Student, StudentAttendance, ScheduleEntry } from '@/types';
import {
  FontFamily,
  FontSize,
  Spacing,
  BorderRadius,
  Shadows,
} from '@/constants/theme';

export default function AttendanceScreen() {
  const { schedule, centerId, periodoId, profesorId } = useTeacher();
  const { colors } = useTheme();

  const currentClass = getCurrentClass(schedule);
  const todayClasses = getTodayClasses(schedule);

  const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(
    currentClass
  );
  const [students, setStudents] = useState<Student[]>([]);
  type AttendanceStatus = 'en_proceso' | 'presente' | 'ausente';
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>(
    {}
  );
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);

  // Cargar estudiantes cuando se selecciona una clase
  const loadStudents = useCallback(async () => {
    if (!selectedEntry || !centerId || !periodoId) return;

    setLoadingStudents(true);
    setSaved(false);
    try {
      const studentList = await getStudentsByGroup(
        centerId,
        periodoId,
        selectedEntry.grupoId
      );
      setStudents(studentList);

      // Verificar si ya existe asistencia para hoy
      const existing = await getAttendance(
        centerId,
        periodoId,
        selectedEntry.grupoId,
        getTodayDate(),
        selectedEntry.id
      );

      if (existing) {
        // Restaurar estado previo
        const map: Record<string, AttendanceStatus> = {};
        for (const record of existing.records) {
          map[record.studentId] = record.status;
        }
        setAttendanceMap(map);
        setSaved(true);
      } else {
        // Todos "en_proceso" por defecto
        const map: Record<string, AttendanceStatus> = {};
        for (const student of studentList) {
          map[student.id] = 'en_proceso';
        }
        setAttendanceMap(map);
      }
    } catch (err) {
      console.error('Error loading students:', err);
      Alert.alert('Error', 'No se pudieron cargar los estudiantes.');
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedEntry, centerId, periodoId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Auto-seleccionar clase actual
  useEffect(() => {
    if (currentClass && !selectedEntry) {
      setSelectedEntry(currentClass);
    }
  }, [currentClass]);

  const toggleAttendance = (studentId: string) => {
    setSaved(false);
    setAttendanceMap((prev) => {
      const current = prev[studentId] || 'en_proceso';
      let next: AttendanceStatus;
      if (current === 'en_proceso') next = 'presente';
      else if (current === 'presente') next = 'ausente';
      else next = 'presente';
      return { ...prev, [studentId]: next };
    });
  };

  const markAllPresent = () => {
    setSaved(false);
    const map: Record<string, AttendanceStatus> = {};
    for (const student of students) {
      map[student.id] = 'presente';
    }
    setAttendanceMap(map);
  };

  const markAllAbsent = () => {
    setSaved(false);
    const map: Record<string, AttendanceStatus> = {};
    for (const student of students) {
      map[student.id] = 'ausente';
    }
    setAttendanceMap(map);
  };

  const handleSave = async () => {
    if (!selectedEntry || !centerId || !periodoId || !profesorId) return;

    setSaving(true);
    try {
      const records: StudentAttendance[] = students.map((student) => ({
        studentId: student.id,
        studentName: student.fullName ?? student.cedula,
        status: attendanceMap[student.id] ?? 'en_proceso',
      }));

      await saveAttendance(centerId, periodoId, {
        scheduleId: selectedEntry.id,
        grupoId: selectedEntry.grupoId,
        grupoNombre: selectedEntry.grupoNombre,
        profesorId: profesorId,
        date: getTodayDate(),
        records,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setSaved(true);
      Alert.alert('Guardado', 'La asistencia se ha guardado correctamente.');
    } catch (err) {
      console.error('Error saving attendance:', err);
      Alert.alert('Error', 'No se pudo guardar la asistencia.');
    } finally {
      setSaving(false);
    }
  };

  const enProcesoCount = Object.values(attendanceMap).filter((v) => v === 'en_proceso').length;
  const presentCount = Object.values(attendanceMap).filter((v) => v === 'presente').length;
  const absentCount = Object.values(attendanceMap).filter((v) => v === 'ausente').length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Asistencia
        </Text>
        <Text style={[styles.headerDate, { color: colors.muted }]}>
          {new Date().toLocaleDateString('es', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      {/* Class selector */}
      <TouchableOpacity
        style={[styles.classSelector, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
        onPress={() => setShowClassPicker(!showClassPicker)}
        activeOpacity={0.7}
      >
        {selectedEntry ? (
          <View style={styles.selectedClassInfo}>
            <View style={[styles.classBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.classBadgeText, { color: colors.primary }]}>
                {formatTime(selectedEntry.horaInicio)}
              </Text>
            </View>
            <View style={styles.selectedClassDetails}>
              <Text style={[styles.selectedClassName, { color: colors.text }]}>
                {selectedEntry.asignaturaNombre}
              </Text>
              <Text style={[styles.selectedClassGroup, { color: colors.muted }]}>
                {selectedEntry.grupoNombre}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.classSelectorPlaceholder, { color: colors.muted }]}>
            Selecciona una clase
          </Text>
        )}
        <Ionicons
          name={showClassPicker ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.muted}
        />
      </TouchableOpacity>

      {/* Class picker dropdown */}
      {showClassPicker && (
        <View style={[styles.classPickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
          {todayClasses.length === 0 ? (
            <Text style={[styles.noClassesText, { color: colors.muted }]}>
              No hay clases hoy
            </Text>
          ) : (
            todayClasses.map((entry) => {
              const isActive = selectedEntry?.id === entry.id;
              const isCurrent = currentClass?.id === entry.id;
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[
                    styles.classPickerItem,
                    isActive && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => {
                    setSelectedEntry(entry);
                    setShowClassPicker(false);
                  }}
                >
                  <View style={styles.classPickerItemContent}>
                    <Text style={[styles.classPickerTime, { color: isActive ? colors.primary : colors.textSecondary }]}>
                      {formatTime(entry.horaInicio)} - {formatTime(entry.horaFin)}
                    </Text>
                    <Text style={[styles.classPickerName, { color: isActive ? colors.primary : colors.text }]}>
                      {entry.asignaturaNombre} - {entry.grupoNombre}
                    </Text>
                  </View>
                  {isCurrent && (
                    <View style={[styles.currentTag, { backgroundColor: colors.successLight }]}>
                      <Text style={[styles.currentTagText, { color: colors.success }]}>Ahora</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {/* Stats bar */}
      {students.length > 0 && (
        <View style={styles.statsBar}>
          <View style={[styles.statChip, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="remove-circle" size={14} color={colors.warning} />
            <Text style={[styles.statText, { color: colors.warning }]}>
              {enProcesoCount}
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[styles.statText, { color: colors.success }]}>
              {presentCount}
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="close-circle" size={14} color={colors.error} />
            <Text style={[styles.statText, { color: colors.error }]}>
              {absentCount}
            </Text>
          </View>
          <View style={styles.statsActions}>
            <TouchableOpacity onPress={markAllPresent} style={styles.quickAction}>
              <Text style={[styles.quickActionText, { color: colors.primary }]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={markAllAbsent} style={styles.quickAction}>
              <Text style={[styles.quickActionText, { color: colors.error }]}>Ninguno</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Student list */}
      {loadingStudents ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Cargando estudiantes...
          </Text>
        </View>
      ) : !selectedEntry ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            Selecciona una clase
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Elige una clase del día para pasar lista
          </Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            Sin estudiantes
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            No hay estudiantes registrados en este grupo
          </Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.studentList}>
            {students.map((student, idx) => {
              const status = attendanceMap[student.id] ?? 'en_proceso';
              const avatarBg = status === 'presente' ? colors.successLight : status === 'ausente' ? colors.errorLight : colors.warningLight;
              const avatarColor = status === 'presente' ? colors.success : status === 'ausente' ? colors.error : colors.warning;
              const toggleBg = status === 'presente' ? colors.success : status === 'ausente' ? colors.error : colors.warning;
              const toggleIcon = status === 'presente' ? 'checkmark' : status === 'ausente' ? 'close' : 'remove';
              return (
                <TouchableOpacity
                  key={student.id}
                  style={[
                    styles.studentItem,
                    { backgroundColor: colors.card },
                    Shadows.sm,
                  ]}
                  onPress={() => toggleAttendance(student.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.studentInfo}>
                    <View
                      style={[
                        styles.studentAvatar,
                        { backgroundColor: avatarBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.studentAvatarText,
                          { color: avatarColor },
                        ]}
                      >
                        {idx + 1}
                      </Text>
                    </View>
                    <View style={styles.studentDetails}>
                      <Text
                        style={[
                          styles.studentName,
                          { color: colors.text },
                        ]}
                      >
                        {student.fullName ?? 'Sin nombre'}
                      </Text>
                      <Text
                        style={[
                          styles.studentId,
                          { color: colors.muted },
                        ]}
                      >
                        {student.cedula}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.studentActions}>
                    <TouchableOpacity
                      style={[styles.chatButton, { backgroundColor: colors.primaryLight }]}
                      onPress={() => {
                        if (selectedEntry) {
                          router.push({
                            pathname: '/compose-comunicado',
                            params: {
                              studentCedula: student.cedula,
                              studentName: student.fullName ?? student.cedula,
                              grupoId: selectedEntry.grupoId,
                              grupoNombre: selectedEntry.grupoNombre,
                            },
                          });
                        }
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="chatbubble-ellipses" size={16} color={colors.primary} />
                    </TouchableOpacity>

                    <View
                      style={[
                        styles.attendanceToggle,
                        { backgroundColor: toggleBg },
                      ]}
                    >
                      <Ionicons
                        name={toggleIcon as any}
                        size={18}
                        color="#fff"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Save Button */}
          <View style={[styles.saveContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: saved ? colors.success : colors.primary,
                },
                saving && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || saved}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : saved ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Guardado</Text>
                </>
              ) : (
                <>
                  <Ionicons name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Guardar asistencia</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
  },
  headerDate: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  // Class selector
  classSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  selectedClassInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  classBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  classBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  selectedClassDetails: {
    flex: 1,
  },
  selectedClassName: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
  },
  selectedClassGroup: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  classSelectorPlaceholder: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
  },
  // Picker dropdown
  classPickerDropdown: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  classPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  classPickerItemContent: {
    flex: 1,
  },
  classPickerTime: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
  },
  classPickerName: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  noClassesText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    padding: Spacing.lg,
    textAlign: 'center',
  },
  currentTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  currentTagText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  // Stats
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  statsActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  quickAction: {
    padding: Spacing.xs,
  },
  quickActionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  // Loading / Empty
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing['3xl'],
  },
  emptyTitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  // Student list
  studentList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
  },
  studentId: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  studentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chatButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Save
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
});
