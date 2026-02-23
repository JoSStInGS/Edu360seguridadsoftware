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
import { useAuth } from '@/contexts/AuthContext';
import { saveMepEmail, logout, isMepEmail } from '@/services/auth';
import { FontFamily, FontSize, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function MepEmailScreen() {
  const { colors } = useTheme();
  const { user, userData } = useAuth();
  const [mepEmail, setMepEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roles = userData?.roles ?? [];

  const handleSave = async () => {
    const trimmed = mepEmail.trim().toLowerCase();

    if (!trimmed) {
      setError('Por favor ingresa tu correo MEP.');
      return;
    }

    if (!isMepEmail(trimmed, roles)) {
      const domain = roles.includes('parent') ? '@est.mep.go.cr' : '@mep.go.cr';
      setError(`El correo debe pertenecer al dominio ${domain}`);
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await saveMepEmail(user.uid, trimmed);

      // Navigate based on role after saving MEP email
      if (roles.includes('parent')) {
        router.replace('/(tabs-parent)');
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      setError('Ocurrió un error al guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

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
        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.lg]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="id-card-outline" size={26} color="#fff" />
            </View>
            <Text style={[styles.title, { color: colors.primary }]}>
              Correo institucional MEP
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Para continuar, registra tu correo institucional del MEP.
            </Text>
          </View>

          {/* Info box */}
          <View style={[styles.infoBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: colors.primary }]}>¿Cuál correo debo ingresar?</Text>
              <Text style={[styles.infoText, { color: colors.primary }]}>
                • Profesores y administrativos: @mep.go.cr{'\n'}
                • Padres de familia: @est.mep.go.cr
              </Text>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          {/* Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Correo MEP</Text>
            <View style={[styles.inputContainer, { borderBottomColor: error ? colors.error : colors.border }]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.placeholder}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text, fontFamily: FontFamily.regular }]}
                placeholder={roles.includes('parent') ? 'usuario@est.mep.go.cr' : 'usuario@mep.go.cr'}
                placeholderTextColor={colors.placeholder}
                value={mepEmail}
                onChangeText={(v) => { setMepEmail(v); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.button }, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Guardar y continuar</Text>
            )}
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutLink}>
            <Text style={[styles.logoutText, { color: colors.muted }]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
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
  title: { fontSize: FontSize['2xl'], fontFamily: FontFamily.bold, textAlign: 'center' },
  subtitle: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, marginTop: Spacing.sm, textAlign: 'center' },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    alignItems: 'flex-start',
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: FontSize.sm, fontFamily: FontFamily.bold, marginBottom: Spacing.xs },
  infoText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, lineHeight: 20 },
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
  label: { fontSize: FontSize.sm, fontFamily: FontFamily.medium, marginBottom: Spacing.sm },
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
  logoutLink: { marginTop: Spacing.xl, alignItems: 'center' },
  logoutText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, textDecorationLine: 'underline' },
});
