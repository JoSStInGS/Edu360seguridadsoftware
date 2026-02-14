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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { FontFamily, FontSize, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  professor: 'Profesor',
  parent: 'Encargado legal',
};

export default function AddRoleScreen() {
  const { colors } = useTheme();
  const { user, userData } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const handleValidateAndAdd = async () => {
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

      // Check if used
      if (codeData.used) {
        setError('Este codigo ya fue utilizado.');
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

      const newRole = codeData.role as string;
      if (!newRole || !['professor', 'parent', 'admin'].includes(newRole)) {
        setError('Rol del codigo invalido.');
        setLoading(false);
        return;
      }

      // Only allow professor and parent on mobile
      if (newRole !== 'professor' && newRole !== 'parent') {
        setError('Este codigo no es valido para la app movil.');
        setLoading(false);
        return;
      }

      // Check if already has this role
      const currentRoles = userData.roles || [];
      if (currentRoles.includes(newRole)) {
        setError('Ya tienes este rol asignado.');
        setLoading(false);
        return;
      }

      // 2. Add role to user profile
      const userRef = doc(db, 'users', user.uid);
      const updateData: Record<string, unknown> = {
        roles: arrayUnion(newRole),
        updatedAt: new Date().toISOString(),
      };

      // If professor: link profesorId
      if (newRole === 'professor' && codeData.profesorId) {
        updateData.profesorId = codeData.profesorId;

        // Link email in profesores collection
        if (codeData.periodId) {
          const profRef = doc(
            db,
            'centers',
            userData.centerId,
            'periods',
            codeData.periodId,
            'profesores',
            codeData.profesorId
          );
          const profDoc = await getDoc(profRef);
          if (profDoc.exists()) {
            await updateDoc(profRef, { email: userData.email || user.email });
          }
        }
      }

      // If parent: create parent-student links
      if (newRole === 'parent' && codeData.studentCedulas?.length > 0 && codeData.periodId) {
        const { createParentLinks } = await import('@/services/parentFirestore');
        await createParentLinks(
          userData.centerId,
          codeData.periodId,
          user.uid,
          userData.email || user.email || '',
          codeData.studentCedulas
        );
      }

      await updateDoc(userRef, updateData);

      // 3. Mark code as used
      await updateDoc(codeRef, {
        used: true,
        usedBy: user.uid,
        usedAt: new Date().toISOString(),
      });

      setNewRoleName(ROLE_LABELS[newRole] || newRole);
      setSuccess(true);
    } catch (err) {
      console.error('Error adding role:', err);
      setError('Error al agregar rol. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.successCard, { backgroundColor: colors.card }, Shadows.lg]}>
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={28} color="#fff" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Rol agregado</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Se agrego el rol de {newRoleName} a tu cuenta exitosamente.
            </Text>
          </View>

          <View style={[styles.roleAddedBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={[styles.roleAddedText, { color: colors.primary }]}>{newRoleName}</Text>
          </View>

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
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.lg]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Agregar rol</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Ingresa el codigo proporcionado por el administrador para agregar otro rol a tu cuenta.
            </Text>
          </View>

          {/* Current roles */}
          <View style={styles.currentRolesContainer}>
            <Text style={[styles.currentRolesLabel, { color: colors.muted }]}>
              Tus roles actuales:
            </Text>
            <View style={styles.rolesList}>
              {(userData?.roles ?? []).map((role) => (
                <View key={role} style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                    {ROLE_LABELS[role] || role}
                  </Text>
                </View>
              ))}
            </View>
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
            onPress={handleValidateAndAdd}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Verificar y agregar rol</Text>
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
  successCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing['3xl'],
    margin: Spacing.lg,
    marginTop: 'auto',
    marginBottom: 'auto',
  },
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
  currentRolesContainer: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  currentRolesLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    marginBottom: Spacing.sm,
  },
  rolesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  roleBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roleBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
  },
  roleAddedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  roleAddedText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
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
});
