import React, { useEffect, useState } from 'react';
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

export default function LoginScreen() {
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
      <StatusBar barStyle="light-content" backgroundColor="#07111f" />

      <View style={styles.hero}>
        <Text style={styles.badge}>India Travel Journal</Text>
        <Text style={styles.title}>Sign in with Gmail to unlock maps, visits, and photo sharing.</Text>
        <Text style={styles.subtitle}>
          This app now requires login before use. Only verified Gmail accounts are allowed.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconBubble}>
          <MaterialCommunityIcons name="google" size={34} color="#ffffff" />
        </View>

        <Text style={styles.cardTitle}>Continue with Google</Text>
        <Text style={styles.cardHint}>
          Use your Gmail account to save visited spots, upload photos, and sync your activity across devices.
        </Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0b1220" />
          ) : (
            <>
              <MaterialCommunityIcons name="google" size={22} color="#0b1220" />
              <Text style={styles.buttonText}>Sign in with Gmail</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms. Your Google account email must end with `@gmail.com`.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#07111f',
  },
  hero: {
    marginBottom: 28,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#16324a',
    color: '#d8ecff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    marginBottom: 16,
  },
  title: {
    color: '#f7fbff',
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 12,
    color: '#9eb5ca',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderRadius: 28,
    backgroundColor: '#f8fbff',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a73e8',
    marginBottom: 18,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  cardHint: {
    color: '#516072',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 22,
  },
  button: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#fbbc04',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#0b1220',
    fontSize: 16,
    fontWeight: '800',
  },
  terms: {
    marginTop: 18,
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
