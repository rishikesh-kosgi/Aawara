import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { favoritesAPI } from '../api';
import { BASE_URL } from '../api';
import { useAuth } from '../utils/AuthContext';
import { radius, shadow } from '../theme';
import { useAppTheme } from '../theme/ThemeProvider';

function getSpotBannerUrl(spot) {
  const filename = spot?.cover_photo || spot?.image_url;
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `${BASE_URL}/uploads/${filename}`;
}

export default function FavoritesScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isLoggedIn } = useAuth();
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    if (isLoggedIn) loadFavorites();
    else setLoading(false);
  }, [isLoggedIn]));

  async function loadFavorites() {
    try {
      const res = await favoritesAPI.getFavorites();
      setSpots(res.data.spots);
    } catch (e) {
      console.error('Load favorites error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function removeFavorite(spotId) {
    try {
      await favoritesAPI.removeFavorite(spotId);
      setSpots(prev => prev.filter(s => s.id !== spotId));
    } catch (e) {}
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.lockEmoji}>✦</Text>
        <Text style={styles.loginTitle}>Log in to see your saved journeys</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginBtnText}>Open Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.card} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Curated list</Text>
        <Text style={styles.title}>Saved Spots</Text>
        <Text style={styles.count}>{spots.length} places you want to come back to.</Text>
      </View>
      <FlatList
        data={spots}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadFavorites(); }}
            tintColor={colors.card}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('SpotDetail', { spotId: item.id, spotName: item.name })}
          >
            {getSpotBannerUrl(item) ? (
              <Image
                source={{ uri: getSpotBannerUrl(item) }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.cardImage, styles.placeholder]}>
                <Text style={{ fontSize: 32, color: colors.textDark }}>✦</Text>
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.spotName}>{item.name}</Text>
              <Text style={styles.spotLocation}>{item.city}, {item.country}</Text>
              <View style={styles.row}>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.photoCount}>{item.photo_count} photos</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeFavorite(item.id)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>A</Text>
            <Text style={styles.emptyText}>No saved spots yet.{'\n'}Explore places and keep the ones you love here.</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Explore')}>
              <Text style={styles.exploreBtnText}>Explore Spots</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 },
  lockEmoji: {
    fontSize: 44,
    width: 84,
    height: 84,
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 42,
    overflow: 'hidden',
    backgroundColor: colors.card,
    color: colors.textDark,
    marginBottom: 16,
  },
  loginTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  loginBtn: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 40, paddingVertical: 14 },
  loginBtnText: { color: colors.textDark, fontWeight: '800', fontSize: 16 },
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: colors.background },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 34, fontWeight: '800', color: colors.textPrimary, marginTop: 6, letterSpacing: -1 },
  count: { fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  list: { padding: 16, gap: 14, paddingBottom: 120 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  cardImage: { width: 100, height: 90 },
  placeholder: { backgroundColor: colors.cardMuted, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, padding: 14, justifyContent: 'center' },
  spotName: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  spotLocation: { color: colors.textSecondary, fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  category: {
    color: colors.textDark, fontSize: 11, fontWeight: '800',
    backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.round,
  },
  photoCount: { color: colors.textMuted, fontSize: 12 },
  removeBtn: { paddingHorizontal: 14, justifyContent: 'center' },
  removeText: { fontSize: 12, color: colors.primary, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: {
    fontSize: 36,
    color: colors.textDark,
    width: 68,
    height: 68,
    borderRadius: 34,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  emptyText: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 24 },
  exploreBtn: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  exploreBtnText: { color: colors.textDark, fontWeight: '800', fontSize: 15 },
});
