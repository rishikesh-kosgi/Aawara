import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { spotsAPI } from '../api';
import { colors, radius, shadow, spacing } from '../theme';

const CATEGORY_COLORS = {
  Landmark: '#E11D48',
  Historical: '#F59E0B',
  Nature: '#10B981',
  Beach: '#0EA5E9',
  Temple: '#7C3AED',
  General: '#64748B',
};

const CATEGORIES = ['All', 'Landmark', 'Historical', 'Nature', 'Beach', 'Temple', 'General'];

const INDIA_REGION = {
  latitude: 22.5,
  longitude: 79.5,
  latitudeDelta: 13.5,
  longitudeDelta: 13.5,
};

function toNumber(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSpot(spot) {
  const latitude = toNumber(spot.latitude);
  const longitude = toNumber(spot.longitude);
  if (latitude == null || longitude == null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { ...spot, latitude, longitude };
}

export default function MapScreen({ navigation }) {
  const mapRef = useRef(null);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadIndiaSpots = useCallback(async () => {
    try {
      setLoading(true);
      const [spotsRes, visitedRes] = await Promise.allSettled([
        spotsAPI.getSpots({ limit: 1000, country: 'India' }),
        spotsAPI.getVisited(),
      ]);

      const rawSpots =
        spotsRes.status === 'fulfilled' && Array.isArray(spotsRes.value.data?.spots)
          ? spotsRes.value.data.spots
          : [];
      const visitedIds = new Set(
        visitedRes.status === 'fulfilled' && Array.isArray(visitedRes.value.data?.spots)
          ? visitedRes.value.data.spots.map(spot => spot.id)
          : []
      );

      const validSpots = rawSpots
        .map(normalizeSpot)
        .filter(Boolean)
        .map(spot => ({
          ...spot,
          is_visited: Boolean(spot.is_visited || visitedIds.has(spot.id)),
        }));

      setSpots(validSpots);
      requestAnimationFrame(() => {
        mapRef.current?.animateToRegion(INDIA_REGION, 500);
      });
    } catch (error) {
      console.error('Map spots error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadIndiaSpots();
    }, [loadIndiaSpots])
  );

  function goToIndia() {
    mapRef.current?.animateToRegion(INDIA_REGION, 700);
  }

  function changeZoom(delta) {
    mapRef.current?.getCamera().then(camera => {
      const nextZoom = Math.min(18, Math.max(3, (camera.zoom || 5) + delta));
      mapRef.current?.animateCamera({ ...camera, zoom: nextZoom }, { duration: 250 });
    }).catch(() => {});
  }

  const filteredSpots = useMemo(() => {
    const source = selectedCategory === 'All' ? spots : spots.filter(spot => spot.category === selectedCategory);
    return [...source].sort((a, b) => Number(b.is_visited) - Number(a.is_visited) || a.name.localeCompare(b.name));
  }, [selectedCategory, spots]);

  const visitedCount = useMemo(() => spots.filter(spot => spot.is_visited).length, [spots]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading India map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>India Spot Map</Text>
          <Text style={styles.headerSub}>{filteredSpots.length} spots</Text>
        </View>
        <View style={styles.visitSummary}>
          <MaterialCommunityIcons name="check-decagram" size={18} color={colors.success} />
          <Text style={styles.visitSummaryText}>{visitedCount} visited</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat}
            style={[
              styles.filterChip,
              selectedCategory === cat && styles.filterChipActive,
              selectedCategory === cat && cat !== 'All' && { backgroundColor: CATEGORY_COLORS[cat] },
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>{cat}</Text>
          </Pressable>
        ))}
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INDIA_REGION}
        minZoomLevel={3}
        maxZoomLevel={18}
        mapType="standard"
        scrollEnabled
        rotateEnabled
        zoomEnabled
        zoomTapEnabled
        pitchEnabled
        showsCompass
      >
        {filteredSpots.map(spot => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            title={spot.is_visited ? `${spot.name} • Visited` : spot.name}
            description={`${spot.city}, ${spot.country} • ${spot.category}`}
            pinColor={spot.is_visited ? colors.success : (CATEGORY_COLORS[spot.category] || colors.primary)}
            onPress={() =>
              navigation.navigate('SpotDetail', {
                spotId: spot.id,
                spotName: spot.name,
              })
            }
          />
        ))}
      </MapView>

      <View style={styles.controls}>
        <Pressable style={styles.controlBtn} onPress={() => changeZoom(1)}>
          <MaterialCommunityIcons name="plus" size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={() => changeZoom(-1)}>
          <MaterialCommunityIcons name="minus" size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={goToIndia}>
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.textPrimary} />
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={loadIndiaSpots}>
          <MaterialCommunityIcons name="refresh" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.tipCard}>
        <MaterialCommunityIcons name="gesture-pinch" size={18} color={colors.textSecondary} />
        <Text style={styles.tipText}>
          Pinch or use + / - to zoom. Green markers are places you have physically visited.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.textSecondary, marginTop: 12, fontSize: 15 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  headerSub: { color: colors.primary, fontWeight: '700', fontSize: 14, marginTop: 2 },
  visitSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.round,
    backgroundColor: colors.surfaceMuted,
  },
  visitSummaryText: { color: colors.textPrimary, fontWeight: '700', fontSize: 12 },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  filterChipActive: { borderColor: 'transparent' },
  filterText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: colors.white },
  map: { flex: 1 },
  controls: { position: 'absolute', right: 16, bottom: 106, gap: 10 },
  controlBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  tipCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  tipText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
});
