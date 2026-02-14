import { useState } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { createParentLinks } from '@/services/parentFirestore';
import { getActivePeriod } from '@/services/firestore';
import { Colors, FontFamily, FontSize, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function AddChildScreen() {
  const { colors } = useTheme();
  const { user, userData } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [addedNames, setAddedNames] = useState<string[]>([]);

  const handleValidateAndLink = async () => {
    if (!code.trim()) {
      setError('Ingresa el codigo de activacion.');
      return;
    }
    if (!user || !userData?.centerId) {
      setError('Error de sesion. Intenta cerrar sesion y volver a ingresar.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. Validate the code
      const codeRef = doc(db, 'centers', userData.centerId, 'register_codes', code.trim());
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        setError('Codigo invalido.');
        setLoading(false);
        return;
      }

      const codeData = codeSnap.data();

      // Check role
      if (codeData.role !== 'parent') {
        setError('Este codigo no es para encargados legales.');
        setLoading(false);
        return;
      }

      // Check expiration
      let expiresAt: Date;
      if (codeData.expires_at instanceof Timestamp) {
        expiresAt = codeData.expires_at.toDate();
      } else {
        expiresAt = new Date(codeData.expires_at);
      }

      if (new Date() > expiresAt) {
        setError('El codigo ha expirado. Solicita uno nuevo.');
        setLoading(false);
        return;
      }

      const studentCedulas: string[] = codeData.studentCedulas || [];
      if (studentCedulas.length === 0) {
        setError('Este codigo no tiene estudiantes vinculados.');
        setLoading(false);
        return;
      }

      // 2. Get active period
      const periodId = codeData.periodId || await getActivePeriod(userData.centerId);
      if (!periodId) {
        setError('No se encontro un periodo activo.');
        setLoading(false);
        return;
      }

      // 3. Create parent-student links
      await createParentLinks(
        userData.centerId,
        periodId,
        user.uid,
        userData.email || user.email || '',
        studentCedulas
      );

      // 4. Get student names for confirmation
      const names: string[] = [];
      for (const cedula of studentCedulas) {
        const studentRef = doc(
          db,
          'centers',
          userData.centerId,
          'periods',
          periodId,
          'students',
          cedula
        );
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const data = studentSnap.data();
          names.push(
            data.fullName ||
            [data.name, data.lastName1, data.lastName2].filter(Boolean).join(' ') ||
            cedula
          );
        } else {
          names.push(cedula);
        }
      }

      setAddedNames(names);
      setSuccess(true);
    } catch (err) {
      console.error('Error adding child:', err);
      setError('Error al vincular. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.lg]}>
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={28} color="#fff" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Hijo(s) agregado(s)</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Se vincularon correctamente:
            </Text>
          </View>

          {addedNames.map((name, i) => (
            <View key={i} style={[styles.nameRow, { backgroundColor: colors.successLight }]}>
              <Ionicons name="person" size={16} color={colors.success} />
              <Text style={[styles.nameText, { color: colors.success }]}>{name}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.button }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Volver al perfil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.lg]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Agregar hijo</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Ingresa el codigo proporcionado por el administrador para vincular otro hijo.
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
              <Ionicons name="key-outline" size={20} color={colors.placeholder} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, fontFamily: FontFamily.regular }]}
                placeholder="Codigo de 6 digitos"
                placeholderTextColor={colors.placeholder}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.button }, loading && styles.buttonDisabled]}
            onPress={handleValidateAndLink}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Vincular hijo</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  backButton: { position: 'absolute', top: 0, left: 0, padding: Spacing.sm },
  card: { borderRadius: BorderRadius.xl, padding: Spacing['3xl'] },
  header: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xl, fontFamily: FontFamily.bold },
  subtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, flex: 1 },
  inputGroup: { marginBottom: Spacing.xl },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingBottom: Spacing.sm,
  },
  inputIcon: { marginRight: Spacing.md },
  input: { flex: 1, fontSize: FontSize.base, paddingVertical: Spacing.xs },
  primaryButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontSize: FontSize.base, fontFamily: FontFamily.bold },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  nameText: { fontSize: FontSize.base, fontFamily: FontFamily.medium },
});
