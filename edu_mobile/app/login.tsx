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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithEmail } from '@/services/auth';
import { Colors, FontFamily, FontSize, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { isAuthenticated, userData } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect when AuthContext confirms authentication
  useEffect(() => {
    if (isAuthenticated && userData?.roles?.length) {
      if (userData.roles.includes('professor')) {
        router.replace('/(tabs)');
      } else if (userData.roles.includes('parent')) {
        router.replace('/(tabs-parent)');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, userData]);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // Don't navigate here - the useEffect above will handle it
      // once AuthContext finishes updating
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al iniciar sesión';
      if (message.includes('profesores') || message.includes('padres')) {
        setError(message);
      } else if (message.includes('invalid-credential') || message.includes('wrong-password') || message.includes('user-not-found')) {
        setError('Correo o contraseña incorrectos.');
      } else {
        setError(message);
      }
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert(
      'Próximamente',
      `El inicio de sesión con ${provider} estará disponible próximamente en la app móvil. Por ahora, usa correo y contraseña.`
    );
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
            <Text style={[styles.title, { color: colors.primary }]}>
              Edu360
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Bienvenido de nuevo
            </Text>
          </View>

          {/* Error */}
          {error ? (
            <View
              style={[
                styles.errorContainer,
                { backgroundColor: colors.errorLight },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <View
              style={[
                styles.inputContainer,
                {
                  borderBottomColor: error ? colors.error : colors.border,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.placeholder}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, fontFamily: FontFamily.regular },
                ]}
                placeholder="Correo electrónico"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View
              style={[
                styles.inputContainer,
                {
                  borderBottomColor: error ? colors.error : colors.border,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.placeholder}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, fontFamily: FontFamily.regular },
                ]}
                placeholder="Contraseña"
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.placeholder}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              { backgroundColor: colors.button },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleEmailLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View
              style={[styles.dividerLine, { backgroundColor: colors.border }]}
            />
            <Text
              style={[
                styles.dividerText,
                { color: colors.muted },
              ]}
            >
              o continúa con
            </Text>
            <View
              style={[styles.dividerLine, { backgroundColor: colors.border }]}
            />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[
                styles.socialButton,
                { borderColor: colors.border },
              ]}
              onPress={() => handleSocialLogin('Google')}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text
                style={[
                  styles.socialButtonText,
                  { color: colors.text },
                ]}
              >
                Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.socialButton,
                { borderColor: colors.border },
              ]}
              onPress={() => handleSocialLogin('Microsoft')}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-microsoft" size={20} color="#00A4EF" />
              <Text
                style={[
                  styles.socialButtonText,
                  { color: colors.text },
                ]}
              >
                Microsoft
              </Text>
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <TouchableOpacity onPress={() => router.push('/register')} style={styles.registerLink}>
            <Text style={[styles.registerText, { color: colors.muted }]}>
              No tienes cuenta?{' '}
              <Text style={{ color: colors.primary, fontFamily: FontFamily.medium }}>Registrate aqui</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  title: {
    fontSize: FontSize['4xl'],
    fontFamily: FontFamily.bold,
  },
  subtitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    marginTop: Spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingBottom: Spacing.sm,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    paddingVertical: Spacing.xs,
  },
  eyeIcon: {
    padding: Spacing.xs,
  },
  loginButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing['2xl'],
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  socialButtonText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
  },
  registerLink: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  registerText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
  },
});
