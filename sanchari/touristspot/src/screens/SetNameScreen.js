import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { authAPI } from '../api';
import { useAuth } from '../utils/AuthContext';
import { radius, shadow, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeProvider';

export default function SetNameScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { updateUser } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSetName() {
    if (name.trim().length < 2) {
      return Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
    }
    setLoading(true);
    try {
      await authAPI.updateProfile(name.trim());
      await updateUser({ name: name.trim() });
      navigation.replace('MainTabs');
    } catch (e) {
      Alert.alert('Error', 'Failed to save your name. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Almost there</Text>
        <Text style={styles.emoji}>A</Text>
        <Text style={styles.title}>Welcome to Aawara</Text>
        <Text style={styles.subtitle}>What should we call you?</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Enter your display name"
        placeholderTextColor={colors.textMuted}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSetName}
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSetName}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={colors.textDark} />
          : <Text style={styles.buttonText}>Get Started</Text>
        }
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.replace('MainTabs')} style={styles.skip}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  card: {
    width: '100%',
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...shadow,
  },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  emoji: {
    fontSize: 36,
    marginBottom: 16,
    color: colors.textDark,
    width: 70,
    height: 70,
    borderRadius: 35,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  title: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, letterSpacing: -0.8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 32 },
  input: {
    width: '100%', backgroundColor: colors.surfaceMuted, borderRadius: radius.md,
    paddingHorizontal: 18, paddingVertical: 14, fontSize: 18,
    color: colors.textPrimary, borderWidth: 1.5, borderColor: colors.border, marginBottom: 20,
  },
  button: {
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.textDark, fontWeight: '800', fontSize: 17 },
  skip: { paddingVertical: 8 },
  skipText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
