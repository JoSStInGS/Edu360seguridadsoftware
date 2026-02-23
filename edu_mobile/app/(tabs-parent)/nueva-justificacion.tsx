import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { useParent } from '@/contexts/ParentContext';
import { useTheme } from '@/hooks/useTheme';
import { FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import {
  getScheduleForDate,
  createJustification,
  calculateDeadline,
} from '@/services/justificationFirestore';
import { getChildAttendanceForDate } from '@/services/parentFirestore';
import type { ScheduleEntry } from '@/types';

// ─── Date helpers ──────────────────────────────────────────────────────────────

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function NuevaJustificacionScreen() {
  const { colors } = useTheme();
  const { user, userData } = useAuth();
  const { centerId, periodoId, children } = useParent();

  // Params (from attendance.tsx "Justificar" button)
  const params = useLocalSearchParams<{
    studentCedula?: string;
    grupoId?: string;
    targetDate?: string;
    scheduleId?: string;
  }>();

  const today = toDateStr(new Date());

  // ── State ──────────────────────────────────────────────────────────────────
  const [type, setType] = useState<'preventiva' | 'posterior'>(
    params.targetDate && params.targetDate < today ? 'posterior' : 'preventiva'
  );
  const [selectedChildIdx, setSelectedChildIdx] = useState<number>(() => {
    if (params.studentCedula) {
      const idx = children.findIndex((c) => c.studentCedula === params.studentCedula);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });
  const [targetDate, setTargetDate] = useState<string>(params.targetDate ?? today);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scope, setScope] = useState<'all_day' | 'specific'>(params.scheduleId ? 'specific' : 'all_day');
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<Set<string>>(
    params.scheduleId ? new Set([params.scheduleId]) : new Set()
  );
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const selectedChild = children[selectedChildIdx] ?? null;

  // ── Load schedule when child / date / type changes ────────────────────────
  useEffect(() => {
    if (!centerId || !periodoId || !selectedChild?.grupoId) {
      setScheduleEntries([]);
      return;
    }
    setLoadingSchedule(true);

    const load = async () => {
      if (type === 'posterior') {
        // Para justificaciones posteriores: solo mostrar clases con ausencia registrada
        const attendance = await getChildAttendanceForDate(
          centerId,
          periodoId,
          selectedChild.studentCedula,
          selectedChild.grupoId!,
          targetDate
        );
        const absentEntries = attendance
          .filter((a) => a.status === 'ausente' && !a.teacherAbsence)
          .map((a) => a.scheduleEntry);

        setScheduleEntries(absentEntries);

        // Pre-select desde params solo si esa clase tiene ausencia
        if (params.scheduleId && absentEntries.some((e) => e.id === params.scheduleId)) {
          setSelectedScheduleIds(new Set([params.scheduleId]));
          setScope('specific');
        }
      } else {
        // Para preventivas: mostrar todas las clases del día
        const entries = await getScheduleForDate(
          centerId,
          periodoId,
          selectedChild.grupoId!,
          targetDate
        );
        setScheduleEntries(entries);

        if (params.scheduleId && entries.some((e) => e.id === params.scheduleId)) {
          setSelectedScheduleIds(new Set([params.scheduleId]));
          setScope('specific');
        }
      }
    };

    load()
      .catch((err) => {
        console.error('Error loading schedule:', err);
        setScheduleEntries([]);
      })
      .finally(() => setLoadingSchedule(false));
  }, [centerId, periodoId, selectedChild, targetDate, type]);

  // ── Date navigation constraints ────────────────────────────────────────────
  const minDate = type === 'preventiva' ? today : undefined;
  const maxDate = type === 'posterior' ? today : undefined;

  const canGoBack = type === 'posterior'
    ? targetDate > addDays(today, -30) // allow up to 30 days back
    : undefined; // preventiva: no restriction going forward, but not into the past

  const changeDate = (offset: number) => {
    const newDate = addDays(targetDate, offset);
    if (type === 'preventiva' && newDate < today) return; // can't go to past for preventiva
    if (type === 'posterior' && newDate > today) return;  // can't go to future for posterior
    setTargetDate(newDate);
    setSelectedScheduleIds(new Set()); // reset selection on date change
  };

  // ── When type changes, adjust date if needed ───────────────────────────────
  const handleTypeChange = (newType: 'preventiva' | 'posterior') => {
    setType(newType);
    if (newType === 'preventiva' && targetDate <= today) {
      setTargetDate(addDays(today, 1));
    } else if (newType === 'posterior' && targetDate > today) {
      setTargetDate(today);
    }
    setSelectedScheduleIds(new Set());
  };

  // ── Toggle schedule selection ──────────────────────────────────────────────
  const toggleSchedule = (id: string) => {
    setSelectedScheduleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Attachment picker ──────────────────────────────────────────────────────
  const pickAttachment = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para adjuntar un comprobante.');
      return;
    }
    Alert.alert('Adjuntar comprobante', 'Elige una opción', [
      {
        text: 'Galería',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets.length > 0) {
            setAttachment(result.assets[0]);
          }
        },
      },
      {
        text: 'Cámara',
        onPress: async () => {
          const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
          if (camStatus !== 'granted') {
            Alert.alert('Permiso necesario', 'Necesitamos acceso a tu cámara.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
          if (!result.canceled && result.assets.length > 0) {
            setAttachment(result.assets[0]);
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  // ── Validation & Submit ────────────────────────────────────────────────────
  const getScheduleDetails = () => {
    const entries = scope === 'all_day'
      ? scheduleEntries
      : scheduleEntries.filter((e) => selectedScheduleIds.has(e.id));

    return entries.map((e) => ({
      scheduleId: e.id,
      asignaturaNombre: e.asignaturaNombre,
      horaInicio: e.horaInicio,
      horaFin: e.horaFin,
      profesorId: e.profesorId,
      profesorNombre: e.profesorNombre,
    }));
  };

  const canSubmit = () => {
    if (!selectedChild?.grupoId) return false;
    if (reason.trim().length < 10) return false;
    if (scope === 'specific' && selectedScheduleIds.size === 0) return false;
    if (scope !== 'all_day' && scope !== 'specific') return false;
    // For posterior: deadline must not be passed
    if (type === 'posterior') {
      const deadline = calculateDeadline(targetDate);
      if (deadline < today) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit() || !centerId || !periodoId || !user || !selectedChild) return;

    const details = getScheduleDetails();
    if (details.length === 0 && scheduleEntries.length > 0 && scope === 'all_day') {
      Alert.alert('Sin clases', 'No se encontraron clases para el día seleccionado.');
      return;
    }

    setSubmitting(true);
    try {
      await createJustification(
        centerId,
        periodoId,
        {
          studentCedula: selectedChild.studentCedula,
          studentName: selectedChild.studentName,
          grupoId: selectedChild.grupoId!,
          grupoNombre: selectedChild.grupoNombre ?? '',
          parentUid: user.uid,
          parentName: userData?.nombre
            ? `${userData.nombre} ${userData.apellido ?? ''}`.trim()
            : user.displayName ?? '',
          type,
          targetDate,
          scope,
          scheduleIds: details.map((d) => d.scheduleId),
          scheduleDetails: details,
          reason: reason.trim(),
        },
        attachment
      );
      Alert.alert('¡Enviada!', 'Tu justificación fue enviada correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('Error creating justification:', err);
      Alert.alert('Error', 'Ocurrió un error al enviar la justificación. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Deadline info for posterior ────────────────────────────────────────────
  const deadlineStr = type === 'posterior' ? calculateDeadline(targetDate) : null;
  const isDeadlinePassed = deadlineStr ? deadlineStr < today : false;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Nueva justificación</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* ── 1. Tipo ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tipo de justificación</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[
              styles.typeCard,
              { backgroundColor: type === 'preventiva' ? colors.primary : colors.card },
              Shadows.sm,
            ]}
            onPress={() => handleTypeChange('preventiva')}
          >
            <Ionicons
              name="calendar-outline"
              size={24}
              color={type === 'preventiva' ? '#fff' : colors.primary}
            />
            <Text style={[styles.typeCardTitle, { color: type === 'preventiva' ? '#fff' : colors.text }]}>
              Preventiva
            </Text>
            <Text style={[styles.typeCardSub, { color: type === 'preventiva' ? 'rgba(255,255,255,0.8)' : colors.muted }]}>
              Antes de la ausencia
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeCard,
              { backgroundColor: type === 'posterior' ? colors.primary : colors.card },
              Shadows.sm,
            ]}
            onPress={() => handleTypeChange('posterior')}
          >
            <Ionicons
              name="clipboard-outline"
              size={24}
              color={type === 'posterior' ? '#fff' : colors.primary}
            />
            <Text style={[styles.typeCardTitle, { color: type === 'posterior' ? '#fff' : colors.text }]}>
              Posterior
            </Text>
            <Text style={[styles.typeCardSub, { color: type === 'posterior' ? 'rgba(255,255,255,0.8)' : colors.muted }]}>
              Hasta 3 días hábiles después
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 2. Hijo ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>¿Para quién es la justificación?</Text>
        <View style={styles.childRow}>
          {children.map((c, idx) => {
            const selected = idx === selectedChildIdx;
            return (
              <TouchableOpacity
                key={c.studentCedula}
                style={[
                  styles.childTab,
                  {
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                  Shadows.sm,
                ]}
                onPress={() => {
                  setSelectedChildIdx(idx);
                  setSelectedScheduleIds(new Set());
                }}
              >
                <View style={[styles.childTabAvatar, { backgroundColor: selected ? 'rgba(255,255,255,0.25)' : colors.primaryLight }]}>
                  <Text style={[styles.childTabAvatarText, { color: selected ? '#fff' : colors.primary }]}>
                    {c.studentName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.childTabText, { color: selected ? '#fff' : colors.text }]}>
                  {c.studentName}
                </Text>
                {selected && (
                  <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 3. Fecha ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Fecha de ausencia</Text>

        {type === 'preventiva' ? (
          /* Preventiva: toca el campo → abre calendar picker */
          <>
            <TouchableOpacity
              style={[styles.datePickerBtn, { backgroundColor: colors.card, borderColor: colors.primary }, Shadows.sm]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.datePickerText, { color: colors.text }]}>
                {formatDateDisplay(targetDate)}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </TouchableOpacity>

            {/* iOS: modal sheet con el picker dentro */}
            {Platform.OS === 'ios' ? (
              <Modal
                transparent
                animationType="slide"
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <TouchableOpacity
                  style={styles.pickerOverlay}
                  activeOpacity={1}
                  onPress={() => setShowDatePicker(false)}
                />
                <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
                  <View style={styles.pickerSheetHeader}>
                    <Text style={[styles.pickerSheetTitle, { color: colors.text }]}>Seleccionar fecha</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={[styles.pickerDone, { color: colors.primary }]}>Listo</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={new Date(targetDate + 'T12:00:00')}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date(today + 'T12:00:00')}
                    locale="es-CR"
                    onChange={(_: DateTimePickerEvent, date?: Date) => {
                      if (date) {
                        const newDate = toDateStr(date);
                        if (newDate >= today) {
                          setTargetDate(newDate);
                          setSelectedScheduleIds(new Set());
                        }
                      }
                    }}
                  />
                </View>
              </Modal>
            ) : (
              /* Android: el picker aparece directamente */
              showDatePicker && (
                <DateTimePicker
                  value={new Date(targetDate + 'T12:00:00')}
                  mode="date"
                  display="default"
                  minimumDate={new Date(today + 'T12:00:00')}
                  onChange={(_: DateTimePickerEvent, date?: Date) => {
                    setShowDatePicker(false);
                    if (date) {
                      const newDate = toDateStr(date);
                      if (newDate >= today) {
                        setTargetDate(newDate);
                        setSelectedScheduleIds(new Set());
                      }
                    }
                  }}
                />
              )
            )}
          </>
        ) : (
          /* Posterior: flechas de navegación día a día (comportamiento actual) */
          <View style={[styles.dateNav, { backgroundColor: colors.card }, Shadows.sm]}>
            <TouchableOpacity
              onPress={() => changeDate(-1)}
              style={styles.dateNavBtn}
              disabled={targetDate <= addDays(today, -30)}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={targetDate <= addDays(today, -30) ? colors.muted : colors.primary}
              />
            </TouchableOpacity>
            <Text style={[styles.dateText, { color: colors.text }]}>{formatDateDisplay(targetDate)}</Text>
            <TouchableOpacity
              onPress={() => changeDate(1)}
              style={styles.dateNavBtn}
              disabled={targetDate >= today}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={targetDate >= today ? colors.muted : colors.primary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Deadline info for posterior */}
        {type === 'posterior' && deadlineStr && (
          <View style={[
            styles.deadlineInfo,
            { backgroundColor: isDeadlinePassed ? colors.errorLight : colors.warningLight },
          ]}>
            <Ionicons
              name={isDeadlinePassed ? 'close-circle' : 'time-outline'}
              size={14}
              color={isDeadlinePassed ? colors.error : colors.warning}
            />
            <Text style={[
              styles.deadlineText,
              { color: isDeadlinePassed ? colors.error : colors.warning },
            ]}>
              {isDeadlinePassed
                ? 'El plazo para justificar esta fecha ya venció'
                : `Plazo límite: ${formatDateDisplay(deadlineStr)}`}
            </Text>
          </View>
        )}

        {/* ── 4. Clases ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Clases a justificar</Text>

        {loadingSchedule ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.md }} />
        ) : scheduleEntries.length === 0 ? (
          <View style={[styles.emptyClasses, { backgroundColor: colors.card }, Shadows.sm]}>
            <Ionicons
              name={type === 'posterior' ? 'checkmark-circle-outline' : 'calendar-outline'}
              size={32}
              color={colors.muted}
            />
            <Text style={[styles.emptyClassesText, { color: colors.muted }]}>
              {type === 'posterior'
                ? 'No hay ausencias registradas para este día'
                : 'No hay clases programadas para este día'}
            </Text>
          </View>
        ) : (
          <>
            {/* Scope toggle */}
            <View style={styles.scopeRow}>
              <TouchableOpacity
                style={[
                  styles.scopeBtn,
                  {
                    backgroundColor: scope === 'all_day' ? colors.primary : colors.card,
                    borderColor: scope === 'all_day' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setScope('all_day')}
              >
                <Text style={[styles.scopeBtnText, { color: scope === 'all_day' ? '#fff' : colors.text }]}>
                  Todo el día
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.scopeBtn,
                  {
                    backgroundColor: scope === 'specific' ? colors.primary : colors.card,
                    borderColor: scope === 'specific' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setScope('specific')}
              >
                <Text style={[styles.scopeBtnText, { color: scope === 'specific' ? '#fff' : colors.text }]}>
                  Clases específicas
                </Text>
              </TouchableOpacity>
            </View>

            {/* Class list (only shown when specific) */}
            {scope === 'specific' && (
              <View style={{ gap: Spacing.xs }}>
                {scheduleEntries.map((entry) => {
                  const selected = selectedScheduleIds.has(entry.id);
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={[
                        styles.classItem,
                        {
                          backgroundColor: selected ? colors.primaryLight : colors.card,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                        Shadows.sm,
                      ]}
                      onPress={() => toggleSchedule(entry.id)}
                    >
                      <View style={styles.classItemLeft}>
                        <Text style={[styles.classTime, { color: colors.muted }]}>
                          {entry.horaInicio} – {entry.horaFin}
                        </Text>
                        <Text style={[styles.className, { color: colors.text }]}>
                          {entry.asignaturaNombre}
                        </Text>
                        <Text style={[styles.classTeacher, { color: colors.textSecondary }]}>
                          Prof. {entry.profesorNombre}
                        </Text>
                      </View>
                      <View style={[
                        styles.checkbox,
                        {
                          backgroundColor: selected ? colors.primary : 'transparent',
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}>
                        {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ── 5. Motivo ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Motivo</Text>
        <View style={[styles.textAreaWrapper, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}>
          <TextInput
            style={[styles.textArea, { color: colors.text }]}
            placeholder="Describe el motivo de la ausencia (mínimo 10 caracteres)..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            value={reason}
            onChangeText={setReason}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: reason.length >= 10 ? colors.success : colors.muted }]}>
            {reason.length} caracteres
          </Text>
        </View>

        {/* ── 6. Adjunto ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Comprobante (opcional)</Text>
        {attachment ? (
          <View style={[styles.attachmentPreview, { backgroundColor: colors.card }, Shadows.sm]}>
            <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} resizeMode="cover" />
            <TouchableOpacity
              style={[styles.removeAttachment, { backgroundColor: colors.error }]}
              onPress={() => setAttachment(null)}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.attachmentBtn, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
            onPress={pickAttachment}
          >
            <Ionicons name="camera-outline" size={24} color={colors.primary} />
            <Text style={[styles.attachmentBtnText, { color: colors.primary }]}>
              Adjuntar foto o documento
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: canSubmit() ? colors.primary : colors.muted },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Enviar justificación</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.lg },

  body: {
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
    gap: Spacing.sm,
  },

  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },

  // Type cards
  typeRow: { flexDirection: 'row', gap: Spacing.md },
  typeCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeCardTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.base, textAlign: 'center' },
  typeCardSub: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, textAlign: 'center' },

  // Child selector
  childRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  childTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  childTabAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childTabAvatarText: { fontFamily: FontFamily.bold, fontSize: FontSize.sm },
  childTabText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium },

  // Date picker button (preventiva)
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  datePickerText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
  },

  // iOS picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing['3xl'],
  },
  pickerSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  pickerSheetTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.base },
  pickerDone: { fontFamily: FontFamily.bold, fontSize: FontSize.base },

  // Date navigator (posterior — flechas)
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  dateNavBtn: { padding: Spacing.xs },
  dateText: { fontFamily: FontFamily.medium, fontSize: FontSize.base, flex: 1, textAlign: 'center' },

  // Deadline info
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  deadlineText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, flex: 1 },

  // Scope buttons
  scopeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  scopeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  scopeBtnText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm },

  // Class items
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  classItemLeft: { flex: 1, gap: 2 },
  classTime: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  className: { fontFamily: FontFamily.medium, fontSize: FontSize.base },
  classTeacher: { fontFamily: FontFamily.regular, fontSize: FontSize.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },

  // Empty classes
  emptyClasses: {
    alignItems: 'center',
    padding: Spacing['3xl'],
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  emptyClassesText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, textAlign: 'center' },

  // Text area
  textAreaWrapper: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  textArea: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    minHeight: 100,
  },
  charCount: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, marginTop: Spacing.xs, textAlign: 'right' },

  // Attachment
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  attachmentBtnText: { fontFamily: FontFamily.medium, fontSize: FontSize.base },
  attachmentPreview: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  attachmentImage: { width: '100%', height: 180 },
  removeAttachment: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
  },
  submitBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: '#fff' },
});
