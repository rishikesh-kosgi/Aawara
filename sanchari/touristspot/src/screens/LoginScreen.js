import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authAPI } from '../api';
import { useAuth } from '../utils/AuthContext';
import { GOOGLE_WEB_CLIENT_ID } from '../config/googleAuth';
import { radius, shadow, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeProvider';

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
      scopes: ['email', 'profile'],
      offlineAccess: false,
    });
  }, []);

  async function handleGoogleLogin() {
    if (!GOOGLE_WEB_CLIENT_ID) {
      return Alert.alert(
        'Google login setup required',
        'Add your Google Web Client ID in src/config/googleAuth.js before testing Google sign-in.'
      );
    }

    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();

      if (result.type !== 'success' || !result.data?.idToken) {
        setLoading(false);
        return;
      }

      const response = await authAPI.googleLogin(result.data.idToken);
      await login(response.data.user, response.data.token);
    } catch (error) {
      Alert.alert('Login failed', error.response?.data?.message || error.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Aawara Travel Companion</Text>
        <Text style={styles.title}>Collect places, journeys, and memories in one quiet map.</Text>
        <Text style={styles.subtitle}>
          Sign in to save visits, share group trips, upload real spot photos, and keep your travel history synced.
        </Text>

        <View style={styles.metricRow}>
          <View style={styles.metricPill}>
            <Text style={styles.metricLabel}>Map</Text>
            <Text style={styles.metricValue}>Live Spots</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricLabel}>Trips</Text>
            <Text style={styles.metricValue}>Group Plans</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionCard}>
        <View style={styles.iconBubble}>
          <MaterialCommunityIcons name="compass-rose" size={30} color={colors.textDark} />
        </View>
        <Text style={styles.cardTitle}>Continue with Google</Text>
        <Text style={styles.cardHint}>
          The app keeps the same features you already use. This just secures your account and syncs your progress.
        </Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textDark} />
          ) : (
            <>
              <MaterialCommunityIcons name="google" size={20} color={colors.textDark} />
              <Text style={styles.buttonText}>Sign in with Gmail</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.terms}>
          Your saved spots, groups, uploads, and visits remain tied to your account.
        </Text>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  heroCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  kicker: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardMuted,
    color: colors.textDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.round,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  metricPill: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    marginTop: 6,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  actionCard: {
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    ...shadow,
  },
  iconBubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.textDark,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  cardHint: {
    color: '#5F4A3C',
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  button: {
    minHeight: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(38,27,20,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '800',
  },
  terms: {
    marginTop: spacing.md,
    color: '#6E594A',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
