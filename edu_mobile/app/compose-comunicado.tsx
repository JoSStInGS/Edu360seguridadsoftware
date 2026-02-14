import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTeacher } from '@/contexts/TeacherContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { getStudentsByGroup } from '@/services/firestore';
import { createComunicado } from '@/services/comunicadoFirestore';
import type { Student, Group } from '@/types';
import {
  FontFamily,
  FontSize,
  Spacing,
  BorderRadius,
  Shadows,
} from '@/constants/theme';

export default function ComposeComunicadoScreen() {
  const { colors } = useTheme();
  const { centerId, periodoId, profesorId, schedule } = useTeacher();
  const { userData } = useAuth();
  const params = useLocalSearchParams<{
    studentCedula?: string;
    studentName?: string;
    grupoId?: string;
    grupoNombre?: string;
  }>();

  const isPrefilled = !!params.studentCedula;

  // Groups derived from schedule
  const groups: Group[] = [];
  const seenGroups = new Set<string>();
  for (const entry of schedule) {
    if (!seenGroups.has(entry.grupoId)) {
      seenGroups.add(entry.grupoId);
      groups.push({ id: entry.grupoId, nombre: entry.grupoNombre });
    }
  }

  const [selectedGroupId, setSelectedGroupId] = useState(params.grupoId || '');
  const [selectedGroupName, setSelectedGroupName] = useState(params.grupoNombre || '');
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ cedula: string; name: string } | null>(
    params.studentCedula
      ? { cedula: params.studentCedula, name: params.studentName || '' }
      : null
  );
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Load students when group changes
  useEffect(() => {
    if (!selectedGroupId || !centerId || !periodoId || isPrefilled) return;

    const load = async () => {
      setLoadingStudents(true);
      try {
        const list = await getStudentsByGroup(centerId, periodoId, selectedGroupId);
        setStudents(list);
      } catch (err) {
        console.error('Error loading students:', err);
      } finally {
        setLoadingStudents(false);
      }
    };
    load();
  }, [selectedGroupId, centerId, periodoId]);

  const handleSend = async () => {
    if (!subject.trim()) {
      Alert.alert('Error', 'Ingresa un asunto.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Error', 'Ingresa el mensaje.');
      return;
    }
    if (!selectedStudent) {
      Alert.alert('Error', 'Selecciona un estudiante.');
      return;
    }
    if (!centerId || !periodoId || !profesorId) return;

    setSending(true);
    try {
      const profesorNombre =
        userData?.displayName || userData?.email || 'Profesor';

      await createComunicado(centerId, periodoId, {
        profesorId,
        profesorNombre,
        studentCedula: selectedStudent.cedula,
        studentName: selectedStudent.name,
        grupoId: selectedGroupId,
        grupoNombre: selectedGroupName,
        subject: subject.trim(),
        message: message.trim(),
        createdAt: new Date().toISOString(),
        readBy: [],
      });

      Alert.alert('Enviado', 'El comunicado se envio correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('Error sending comunicado:', err);
      Alert.alert('Error', 'No se pudo enviar el comunicado.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Nuevo comunicado</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Group selector */}
          {isPrefilled ? (
            <View style={[styles.infoCard, { backgroundColor: colors.card }, Shadows.sm]}>
              <View style={styles.infoRow}>
                <Ionicons name="people" size={18} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Grupo:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{selectedGroupName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="person" size={18} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Estudiante:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{selectedStudent?.name}</Text>
              </View>
            </View>
          ) : (
            <>
              {/* Group picker */}
              <Text style={[styles.label, { color: colors.text }]}>Grupo</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
                onPress={() => setShowGroupPicker(!showGroupPicker)}
              >
                <Text style={[styles.selectorText, { color: selectedGroupId ? colors.text : colors.placeholder }]}>
                  {selectedGroupName || 'Seleccionar grupo...'}
                </Text>
                <Ionicons name={showGroupPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
              </TouchableOpacity>

              {showGroupPicker && (
                <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
                  {groups.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.dropdownItem, selectedGroupId === g.id && { backgroundColor: colors.primaryLight }]}
                      onPress={() => {
                        setSelectedGroupId(g.id);
                        setSelectedGroupName(g.nombre);
                        setSelectedStudent(null);
                        setShowGroupPicker(false);
                      }}
                    >
                      <Text style={[styles.dropdownText, { color: selectedGroupId === g.id ? colors.primary : colors.text }]}>
                        {g.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Student picker */}
              {selectedGroupId && (
                <>
                  <Text style={[styles.label, { color: colors.text, marginTop: Spacing.lg }]}>Estudiante</Text>
                  {loadingStudents ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: Spacing.sm }} />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.sm]}
                        onPress={() => setShowStudentPicker(!showStudentPicker)}
                      >
                        <Text style={[styles.selectorText, { color: selectedStudent ? colors.text : colors.placeholder }]}>
                          {selectedStudent?.name || 'Seleccionar estudiante...'}
                        </Text>
                        <Ionicons name={showStudentPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
                      </TouchableOpacity>

                      {showStudentPicker && (
                        <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }, Shadows.md]}>
                          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                            {students.map((s) => (
                              <TouchableOpacity
                                key={s.id}
                                style={[styles.dropdownItem, selectedStudent?.cedula === s.cedula && { backgroundColor: colors.primaryLight }]}
                                onPress={() => {
                                  setSelectedStudent({ cedula: s.cedula, name: s.fullName || s.cedula });
                                  setShowStudentPicker(false);
                                }}
                              >
                                <Text style={[styles.dropdownText, { color: selectedStudent?.cedula === s.cedula ? colors.primary : colors.text }]}>
                                  {s.fullName || s.cedula}
                                </Text>
                                <Text style={[styles.dropdownMeta, { color: colors.muted }]}>{s.cedula}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* Subject */}
          <Text style={[styles.label, { color: colors.text, marginTop: Spacing.xl }]}>Asunto</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Ej: Comportamiento en clase"
            placeholderTextColor={colors.placeholder}
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
            editable={!sending}
          />

          {/* Message */}
          <Text style={[styles.label, { color: colors.text, marginTop: Spacing.lg }]}>Mensaje</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Escribe el comunicado..."
            placeholderTextColor={colors.placeholder}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!sending}
          />

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }, sending && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.sendButtonText}>Enviar comunicado</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing['5xl'] },
  infoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoLabel: { fontFamily: FontFamily.regular, fontSize: FontSize.sm },
  infoValue: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, flex: 1 },
  label: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, marginBottom: Spacing.sm },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  selectorText: { fontFamily: FontFamily.regular, fontSize: FontSize.base, flex: 1 },
  dropdown: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  dropdownItem: { padding: Spacing.md },
  dropdownText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm },
  dropdownMeta: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    minHeight: 140,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 2,
    marginTop: Spacing['2xl'],
  },
  buttonDisabled: { opacity: 0.6 },
  sendButtonText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: FontSize.base },
});
