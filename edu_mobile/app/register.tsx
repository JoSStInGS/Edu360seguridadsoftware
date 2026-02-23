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
import { collection, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { registerWithEmail, createUserProfile, isMepEmail } from '@/services/auth';
import { Colors, FontFamily, FontSize, BorderRadius, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Center {
  id: string;
  name: string;
}

interface CodeData {
  role: string;
  expires_at: Timestamp | Date | string;
  studentCedulas?: string[];
  periodId?: string;
  profesorId?: string;
}

export default function RegisterScreen() {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [code, setCode] = useState('');
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [showCenterPicker, setShowCenterPicker] = useState(false);
  const [centerSearch, setCenterSearch] = useState('');
  const [loadingCenters, setLoadingCenters] = useState(true);

  // Validated data from code
  const [validatedRole, setValidatedRole] = useState<string | null>(null);
  const [studentCedulas, setStudentCedulas] = useState<string[]>([]);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [profesorId, setProfesorId] = useState<string | null>(null);

  // Step 2
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Load centers from Firestore
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'centers'));
        const list: Center[] = snapshot.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.id,
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setCenters(list);
      } catch (err) {
        console.error('Error fetching centers:', err);
      } finally {
        setLoadingCenters(false);
      }
    };
    fetchCenters();
  }, []);

  const filteredCenters = centerSearch
    ? centers.filter((c) => c.name.toLowerCase().includes(centerSearch.toLowerCase()))
    : centers;

  const handleValidateCode = async () => {
    if (!code.trim()) {
      setError('Ingresa el codigo de activacion.');
      return;
    }
    if (!selectedCenter) {
      setError('Selecciona un centro educativo.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const codeRef = doc(db, 'centers', selectedCenter.id, 'register_codes', code.trim());
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        setError('Codigo invalido. Verifica e intenta de nuevo.');
        setLoading(false);
        return;
      }

      const codeData = codeSnap.data() as CodeData;

      // Check expiration
      let expiresAt: Date;
      if (codeData.expires_at instanceof Timestamp) {
        expiresAt = codeData.expires_at.toDate();
      } else if (codeData.expires_at instanceof Date) {
        expiresAt = codeData.expires_at;
      } else {
        expiresAt = new Date(codeData.expires_at);
      }

      if (new Date() > expiresAt) {
        setError('El codigo ha expirado. Solicita uno nuevo.');
        setLoading(false);
        return;
      }

      // Only accept professor or parent roles on mobile
      if (codeData.role !== 'professor' && codeData.role !== 'parent') {
        setError('Este codigo no es valido para la app movil.');
        setLoading(false);
        return;
      }

      setValidatedRole(codeData.role);
      setStudentCedulas(codeData.studentCedulas || []);
      setPeriodId(codeData.periodId || null);
      setProfesorId(codeData.profesorId || null);
      setStep(2);
    } catch (err) {
      console.error('Validation error:', err);
      setError('Error al validar el codigo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!displayName.trim()) {
      setError('Ingresa tu nombre completo.');
      return;
    }
    if (!email.trim()) {
      setError('Ingresa tu correo electronico.');
      return;
    }
    if (password.length < 9) {
      setError('La contrasena debe tener al menos 9 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. Create Firebase Auth user
      const user = await registerWithEmail(email.trim(), password, displayName.trim());

      // 2. Create user profile in Firestore
      const profileData: {
        email: string;
        displayName: string;
        roles: string[];
        centerId: string;
        centerName: string;
        profesorId?: string;
        mepEmail?: string;
      } = {
        email: email.trim(),
        displayName: displayName.trim(),
        roles: [validatedRole!],
        centerId: selectedCenter!.id,
        centerName: selectedCenter!.name,
      };

      if (validatedRole === 'professor' && profesorId) {
        profileData.profesorId = profesorId;
      }

      // If the registration email is a MEP email, save it automatically
      if (isMepEmail(email.trim(), [validatedRole!])) {
        profileData.mepEmail = email.trim().toLowerCase();
      }

      await createUserProfile(user.uid, profileData);

      // 3. If parent, create parent-student links directly in Firestore
      if (validatedRole === 'parent' && studentCedulas.length > 0 && periodId) {
        const { createParentLinks } = await import('@/services/parentFirestore');
        await createParentLinks(
          selectedCenter!.id,
          periodId,
          user.uid,
          email.trim(),
          studentCedulas
        );
      }

      // 4. If professor, link professor email
      if (validatedRole === 'professor' && profesorId && periodId) {
        const { doc: firestoreDoc, updateDoc } = await import('firebase/firestore');
        const profRef = firestoreDoc(
          db,
          'centers',
          selectedCenter!.id,
          'periods',
          periodId,
          'profesores',
          profesorId
        );
        await updateDoc(profRef, { email: email.trim() });
      }

      // If MEP email was not auto-saved, redirect to the capture screen
      if (!profileData.mepEmail) {
        router.replace('/mep-email');
      } else if (validatedRole === 'parent') {
        router.replace('/(tabs-parent)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrarse';
      if (message.includes('email-already-in-use')) {
        setError('Este correo ya esta registrado. Intenta iniciar sesion.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = () => {
    if (validatedRole === 'professor') return 'Profesor';
    if (validatedRole === 'parent') return 'Encargado legal';
    return '';
  };

  // Step 2: Create account
  if (step === 2) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={[styles.card, { backgroundColor: colors.card }, Shadows.lg]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconBadge, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark" size={24} color="#fff" />
              </View>
              <Text style={[styles.title, { color: colors.primary }]}>Codigo validado</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Registrandote como {getRoleLabel()}
              </Text>
            </View>

            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}

            {/* Name */}
            <View style={styles.inputGroup}>
              <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                <Ionicons name="person-outline" size={20} color={colors.placeholder} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, fontFamily: FontFamily.regular }]}
                  placeholder="Nombre completo"
                  placeholderTextColor={colors.placeholder}
                  value={displayName}
                  onChangeText={setDisplayName}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                <Ionicons name="mail-outline" size={20} color={colors.placeholder} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, fontFamily: FontFamily.regular }]}
                  placeholder="Correo electronico"
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

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.placeholder} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, fontFamily: FontFamily.regular }]}
                  placeholder="Contrasena (min. 9 caracteres)"
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.placeholder} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.placeholder} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, fontFamily: FontFamily.regular }]}
                  placeholder="Confirmar contrasena"
                  placeholderTextColor={colors.placeholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.button }, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Crear cuenta</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setStep(1); setError(''); }} style={styles.backLink}>
              <Text style={[styles.backLinkText, { color: colors.muted }]}>Volver al paso anterior</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Step 1: Validate code
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.card, { backgroundColor: colors.card }, Shadows.lg]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.primary }]}>Edu360</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Crea tu cuenta con el codigo proporcionado
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          {/* Activation Code */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Codigo de activacion</Text>
            <View style={[styles.inputContainer, { borderBottomColor: error && !code ? colors.error : colors.border }]}>
              <Ionicons name="key-outline" size={20} color={colors.placeholder} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, fontFamily: FontFamily.regular }]}
                placeholder="Ingresa el codigo de 6 digitos"
                placeholderTextColor={colors.placeholder}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
            </View>
          </View>

          {/* Center Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Centro educativo</Text>
            {loadingCenters ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: Spacing.sm }} />
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.selectorButton,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                  onPress={() => setShowCenterPicker(!showCenterPicker)}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      {
                        color: selectedCenter ? colors.text : colors.placeholder,
                        fontFamily: FontFamily.regular,
                      },
                    ]}
                  >
                    {selectedCenter ? selectedCenter.name : 'Seleccionar centro...'}
                  </Text>
                  <Ionicons
                    name={showCenterPicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.placeholder}
                  />
                </TouchableOpacity>

                {showCenterPicker && (
                  <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.searchInput, { color: colors.text, borderColor: colors.border, fontFamily: FontFamily.regular }]}
                      placeholder="Buscar centro..."
                      placeholderTextColor={colors.placeholder}
                      value={centerSearch}
                      onChangeText={setCenterSearch}
                    />
                    <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                      {filteredCenters.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={[
                            styles.dropdownItem,
                            selectedCenter?.id === c.id && { backgroundColor: colors.primaryLight },
                          ]}
                          onPress={() => {
                            setSelectedCenter(c);
                            setShowCenterPicker(false);
                            setCenterSearch('');
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { color: colors.text, fontFamily: FontFamily.regular }]}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {filteredCenters.length === 0 && (
                        <Text style={[styles.emptyText, { color: colors.muted }]}>No se encontraron centros</Text>
                      )}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Validate Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.button }, loading && styles.buttonDisabled]}
            onPress={handleValidateCode}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Verificar y continuar</Text>
            )}
          </TouchableOpacity>

          {/* Back to login */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={[styles.backLinkText, { color: colors.muted }]}>Ya tengo cuenta. Iniciar sesion</Text>
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
  header: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize['4xl'], fontFamily: FontFamily.bold },
  subtitle: { fontSize: FontSize.base, fontFamily: FontFamily.regular, marginTop: Spacing.sm, textAlign: 'center' },
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
  eyeIcon: { padding: Spacing.xs },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  selectorText: { fontSize: FontSize.base, flex: 1 },
  dropdown: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    maxHeight: 200,
    overflow: 'hidden',
  },
  searchInput: {
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
  },
  dropdownList: { maxHeight: 150 },
  dropdownItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  dropdownItemText: { fontSize: FontSize.sm },
  emptyText: { padding: Spacing.md, fontSize: FontSize.sm, textAlign: 'center' },
  primaryButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontSize: FontSize.base, fontFamily: FontFamily.bold },
  backLink: { marginTop: Spacing.xl, alignItems: 'center' },
  backLinkText: { fontSize: FontSize.sm, fontFamily: FontFamily.regular, textDecorationLine: 'underline' },
});
