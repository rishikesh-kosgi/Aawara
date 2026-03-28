import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { spotsAPI } from '../api';
import { useAuth } from '../utils/AuthContext';
import AppHeader from '../components/ui/AppHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import { colors, radius, shadow, spacing } from '../theme';

const CATEGORIES = ['Landmark', 'Historical', 'Nature', 'Beach', 'Temple', 'Trekking', 'General'];

function Field({ label, required = false, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      {children}
    </View>
  );
}

export default function SubmitSpotScreen({ navigation }) {
  const { isLoggedIn, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  function useMyLocation() {
    setLocating(true);
    Geolocation.getCurrentPosition(
      pos => {
        setLatitude(pos.coords.latitude.toString());
        setLongitude(pos.coords.longitude.toString());
        setLocating(false);
        Alert.alert('Location set', `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      () => {
        setLocating(false);
        Alert.alert('Error', 'Could not get location. Enable GPS and try again.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit() {
    if (!isLoggedIn) return navigation.navigate('Login');
    if (!name.trim()) return Alert.alert('Required', 'Please enter a spot name.');
    if (!city.trim()) return Alert.alert('Required', 'Please enter a city.');
    if (!country.trim()) return Alert.alert('Required', 'Please enter a country.');
    if (!latitude || !longitude) return Alert.alert('Required', 'Please set location coordinates.');

    setLoading(true);
    try {
      await spotsAPI.submitSpot({
        name: name.trim(),
        description: description.trim(),
        category,
        city: city.trim(),
        country: country.trim(),
        address: address.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });
      await refreshUser(false);
      Alert.alert(
        'Spot Submitted',
        'Your spot needs 5 community votes before appearing publicly. You earned +5 points.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Add New Spot" subtitle="Share a location with live updates" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
          <Text style={styles.infoEmoji}>💡</Text>
          <Text style={styles.infoText}>
            Add accurate details. Spots are visible after community approval. You get reward points for accepted spots.
          </Text>
        </View>

        <Field label="Spot Name" required>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Mysore Palace"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="Description">
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe this place..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </Field>

        <Field label="Category" required>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat}
                style={[styles.catChip, category === cat && styles.catChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="City" required>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Mysuru"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="Country" required>
          <TextInput
            style={styles.input}
            value={country}
            onChangeText={setCountry}
            placeholder="e.g. India"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="Address">
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Optional full address"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="Location Coordinates" required>
          <Pressable style={styles.locationBtn} onPress={useMyLocation} disabled={locating}>
            {locating ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.locationEmoji}>📍</Text>
                <Text style={styles.locationBtnText}>Use Current Location</Text>
              </>
            )}
          </Pressable>
          <View style={styles.coordsRow}>
            <TextInput
              style={[styles.input, styles.coordInput]}
              value={latitude}
              onChangeText={setLatitude}
              placeholder="Latitude"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.coordInput]}
              value={longitude}
              onChangeText={setLongitude}
              placeholder="Longitude"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>
        </Field>

        <PrimaryButton label="Submit Spot" onPress={handleSubmit} loading={loading} style={styles.submitBtn} />

        <Pressable style={styles.pendingBtn} onPress={() => navigation.navigate('PendingSpots')}>
          <Text style={styles.pendingEmoji}>👥</Text>
          <Text style={styles.pendingBtnText}>Review Pending Spots</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  form: { padding: spacing.lg, paddingBottom: 40 },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  infoText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  infoEmoji: { fontSize: 16 },
  fieldWrap: { marginTop: spacing.md },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: spacing.md,
  },
  textArea: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  catTextActive: { color: colors.white },
  locationBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...shadow,
  },
  locationBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  locationEmoji: { color: colors.white, fontSize: 14 },
  coordsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  coordInput: { flex: 1 },
  submitBtn: { marginTop: spacing.xl },
  pendingBtn: {
    marginTop: spacing.md,
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pendingBtnText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  pendingEmoji: { fontSize: 15 },
});
