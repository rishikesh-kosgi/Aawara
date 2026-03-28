import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { authAPI } from '../api';
import { useAuth } from '../utils/AuthContext';

export default function SetNameScreen({ navigation }) {
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
      <Text style={styles.emoji}>👋</Text>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>What should we call you?</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Enter your display name"
        placeholderTextColor="#888"
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
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Get Started 🚀</Text>
        }
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.replace('MainTabs')} style={styles.skip}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#aaa', marginBottom: 32 },
  input: {
    width: '100%', backgroundColor: '#16213e', borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 14, fontSize: 18,
    color: '#fff', borderWidth: 1.5, borderColor: '#333', marginBottom: 20,
  },
  button: {
    backgroundColor: '#e94560', borderRadius: 14,
    paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  skip: { paddingVertical: 8 },
  skipText: { color: '#888', fontSize: 14 },
});