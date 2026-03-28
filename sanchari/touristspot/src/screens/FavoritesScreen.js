import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { favoritesAPI } from '../api';
import { BASE_URL } from '../api';
import { useAuth } from '../utils/AuthContext';

export default function FavoritesScreen({ navigation }) {
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
        <Text style={styles.lockEmoji}>🔒</Text>
        <Text style={styles.loginTitle}>Log in to see your favorites</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginBtnText}>Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#e94560" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>❤️ My Favorites</Text>
        <Text style={styles.count}>{spots.length} spots saved</Text>
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
            tintColor="#e94560"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('SpotDetail', { spotId: item.id, spotName: item.name })}
          >
            {item.cover_photo ? (
              <Image
                source={{ uri: `${BASE_URL}/uploads/${item.cover_photo}` }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.cardImage, styles.placeholder]}>
                <Text style={{ fontSize: 32 }}>🏔️</Text>
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.spotName}>{item.name}</Text>
              <Text style={styles.spotLocation}>📍 {item.city}, {item.country}</Text>
              <View style={styles.row}>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.photoCount}>📸 {item.photo_count}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeFavorite(item.id)}>
              <Text style={styles.removeText}>❤️</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyText}>No favorites yet{'\n'}Explore and save spots you love!</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Explore')}>
              <Text style={styles.exploreBtnText}>Explore Spots</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, backgroundColor: '#0f0f1a', alignItems: 'center', justifyContent: 'center', padding: 32 },
  lockEmoji: { fontSize: 52, marginBottom: 16 },
  loginTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  loginBtn: { backgroundColor: '#e94560', borderRadius: 12, paddingHorizontal: 40, paddingVertical: 14 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#1a1a2e' },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  count: { fontSize: 13, color: '#aaa', marginTop: 4 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#1e1e2e', borderRadius: 16, flexDirection: 'row', overflow: 'hidden', elevation: 3 },
  cardImage: { width: 100, height: 90 },
  placeholder: { backgroundColor: '#2a2a3e', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, padding: 14, justifyContent: 'center' },
  spotName: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  spotLocation: { color: '#aaa', fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  category: {
    color: '#e94560', fontSize: 11, fontWeight: '700',
    backgroundColor: 'rgba(233,69,96,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  photoCount: { color: '#888', fontSize: 12 },
  removeBtn: { paddingHorizontal: 14, justifyContent: 'center' },
  removeText: { fontSize: 22 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 52 },
  emptyText: { color: '#666', fontSize: 15, textAlign: 'center', lineHeight: 24 },
  exploreBtn: { backgroundColor: '#e94560', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  exploreBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
