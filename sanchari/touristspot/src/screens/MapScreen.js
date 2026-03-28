import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { WebView } from 'react-native-webview';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { spotsAPI } from '../api';
import { radius, shadow, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeProvider';

const CATEGORY_COLORS = {
  Landmark: '#C86F4C',
  Historical: '#D9A45B',
  Nature: '#7FB069',
  Beach: '#8BAFC9',
  Temple: '#9D7A5B',
  Trekking: '#BC7E46',
  General: '#A69788',
};

const CATEGORY_ORDER = ['All', 'Landmark', 'Historical', 'Nature', 'Beach', 'Temple', 'Trekking', 'General'];
const COUNTRY_OPTIONS = [
  { key: 'India', label: 'India' },
  { key: 'United States', label: 'USA' },
  { key: 'ALL_COUNTRIES', label: 'World' },
];

const DEFAULT_VIEWS = {
  India: { center: [22.5, 79.5], zoom: 5 },
  'United States': { center: [39.8283, -98.5795], zoom: 4 },
  ALL_COUNTRIES: { center: [20, 0], zoom: 2 },
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

function buildMapHtml(spots, selectedCountry, themeColors) {
  const defaultView = DEFAULT_VIEWS[selectedCountry] || DEFAULT_VIEWS.ALL_COUNTRIES;
  const payload = spots.map(spot => ({
    id: spot.id,
    name: spot.name,
    city: spot.city,
    country: spot.country,
    category: spot.category,
    latitude: spot.latitude,
    longitude: spot.longitude,
    isVisited: Boolean(spot.is_visited),
    color: spot.is_visited ? themeColors.success : (CATEGORY_COLORS[spot.category] || themeColors.primary),
  }));

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        background: #ead9c1;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .leaflet-container {
        background: #ead9c1;
      }
      #status {
        position: fixed;
        left: 12px;
        right: 12px;
        bottom: 12px;
        z-index: 999;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(30, 24, 20, 0.9);
        color: white;
        font-size: 13px;
        line-height: 1.4;
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div id="status"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const spots = ${JSON.stringify(payload)};
      const defaultView = ${JSON.stringify(defaultView)};
      const statusEl = document.getElementById('status');
      let map;
      let bounds;

      function showStatus(message) {
        statusEl.style.display = 'block';
        statusEl.textContent = message;
      }

      function clearStatus() {
        statusEl.style.display = 'none';
        statusEl.textContent = '';
      }

      function post(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function makeMarker(spot) {
        const marker = L.circleMarker([spot.latitude, spot.longitude], {
          radius: spot.isVisited ? 9 : 7,
          color: spot.color,
          fillColor: spot.color,
          fillOpacity: 0.9,
          weight: 2,
        });

        marker.bindPopup(
          '<div style="min-width:180px">' +
            '<strong>' + spot.name + '</strong><br />' +
            spot.city + ', ' + spot.country + '<br />' +
            spot.category + (spot.isVisited ? ' • Visited' : '') +
            '<br /><button style="margin-top:8px;padding:7px 12px;border:none;border-radius:999px;background:#c86f4c;color:#fff;font-weight:700;" onclick="window.__openSpot(' + spot.id + ', ' + JSON.stringify(spot.name) + ')">Open Spot</button>' +
          '</div>'
        );

        marker.on('click', function() {
          post({ type: 'marker_press', spotId: spot.id, spotName: spot.name });
        });

        bounds.push([spot.latitude, spot.longitude]);
        return marker;
      }

      window.__openSpot = function(id, name) {
        post({ type: 'marker_press', spotId: id, spotName: name });
      };

      function resetMapView() {
        if (!map) return;
        if (bounds.length) {
          map.fitBounds(bounds, { padding: [36, 36] });
        } else {
          map.setView(defaultView.center, defaultView.zoom);
        }
      }

      function changeMapZoom(delta) {
        if (!map) return;
        map.setZoom((map.getZoom() || defaultView.zoom) + delta);
      }

      window.resetMapView = resetMapView;
      window.changeMapZoom = changeMapZoom;

      function boot() {
        if (!window.L) {
          showStatus('Map library failed to load. Check your internet connection and reopen this screen.');
          post({ type: 'map_error', message: 'Leaflet failed to load' });
          return;
        }

        map = L.map('map', {
          zoomControl: false,
          preferCanvas: true,
        }).setView(defaultView.center, defaultView.zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        bounds = [];
        spots.forEach(spot => makeMarker(spot).addTo(map));

        if (bounds.length) {
          clearStatus();
          map.fitBounds(bounds, { padding: [36, 36] });
        } else {
          showStatus('No spots match the current filters. Try All Spots or another category.');
        }
      }

      window.addEventListener('load', boot);
    </script>
  </body>
</html>`;
}

export default function MapScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('India');
  const [showFilters, setShowFilters] = useState(false);

  const loadMapSpots = useCallback(async () => {
    try {
      setLoading(true);
      const [spotsRes, visitedRes] = await Promise.allSettled([
        spotsAPI.getSpots({ limit: 5000 }),
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
    } catch (error) {
      console.error('Map spots error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMapSpots();
  }, [loadMapSpots]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadMapSpots);
    return unsubscribe;
  }, [loadMapSpots, navigation]);

  const categories = useMemo(() => {
    const fromData = Array.from(new Set(spots.map(spot => spot.category).filter(Boolean)));
    const ordered = CATEGORY_ORDER.filter(category => category === 'All' || fromData.includes(category));
    const extras = fromData.filter(category => !CATEGORY_ORDER.includes(category)).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...extras];
  }, [spots]);

  const filteredSpots = useMemo(() => {
    let source = viewMode === 'visited' ? spots.filter(spot => spot.is_visited) : spots;
    if (selectedCountry !== 'ALL_COUNTRIES') {
      source = source.filter(spot => spot.country === selectedCountry);
    }
    if (selectedCategory !== 'All') {
      source = source.filter(spot => spot.category === selectedCategory);
    }
    return [...source].sort((a, b) => Number(b.is_visited) - Number(a.is_visited) || a.name.localeCompare(b.name));
  }, [selectedCategory, selectedCountry, spots, viewMode]);

  const visitedCount = useMemo(() => spots.filter(spot => spot.is_visited).length, [spots]);
  const mapHtml = useMemo(() => buildMapHtml(filteredSpots, selectedCountry, colors), [colors, filteredSpots, selectedCountry]);
  const activeFilterLabel = selectedCategory === 'All' ? 'Filter' : selectedCategory;

  function handleMapMessage(event) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'marker_press' && data.spotId) {
        navigation.navigate('SpotDetail', {
          spotId: data.spotId,
          spotName: data.spotName,
        });
      }
      if (data.type === 'map_error') {
        console.warn('Map webview error:', data.message);
      }
    } catch (error) {
      console.warn('Map message parse error:', error);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your travel atlas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Aawara</Text>
          <Text style={styles.headerSub}>{filteredSpots.length} spots in view • {visitedCount} visited</Text>
        </View>
      </View>

      <View style={styles.toolbarRow}>
        <Pressable
          style={[styles.toolbarChip, viewMode === 'all' && styles.toolbarChipActive]}
          onPress={() => {
            setViewMode('all');
            setShowFilters(false);
          }}
        >
          <Text style={[styles.toolbarChipText, viewMode === 'all' && styles.toolbarChipTextActive]}>
            All Spots
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toolbarChip, viewMode === 'visited' && styles.toolbarChipActive]}
          onPress={() => {
            setViewMode('visited');
            setShowFilters(false);
          }}
        >
          <Text style={[styles.toolbarChipText, viewMode === 'visited' && styles.toolbarChipTextActive]}>
            Your Spots
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterTrigger, showFilters && styles.filterTriggerActive]}
          onPress={() => setShowFilters(current => !current)}
        >
          <MaterialCommunityIcons
            name="tune-variant"
            size={16}
            color={showFilters || selectedCategory !== 'All' ? colors.textDark : colors.textPrimary}
          />
          <Text style={[styles.filterTriggerText, (showFilters || selectedCategory !== 'All') && styles.filterTriggerTextActive]}>
            {activeFilterLabel}
          </Text>
        </Pressable>
      </View>

      {showFilters ? (
        <View style={styles.filterPanel}>
          <Text style={styles.filterPanelLabel}>Category</Text>
          <View style={styles.filterOptionsRow}>
            {categories.map(cat => (
              <Pressable
                key={cat}
                style={[
                  styles.filterChip,
                  selectedCategory === cat && styles.filterChipActive,
                  selectedCategory === cat && cat !== 'All' && { backgroundColor: CATEGORY_COLORS[cat] },
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setShowFilters(false);
                }}
              >
                <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterPanelLabel}>Region</Text>
          <View style={styles.filterOptionsRow}>
            {COUNTRY_OPTIONS.map(option => (
              <Pressable
                key={option.key}
                style={[styles.countryChip, selectedCountry === option.key && styles.countryChipActive]}
                onPress={() => setSelectedCountry(option.key)}
              >
                <Text style={[styles.countryChipText, selectedCountry === option.key && styles.countryChipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.mapWrap}>
        <WebView
          style={styles.map}
          source={{ html: mapHtml }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMapMessage}
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webLoadingOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.webLoadingText}>Rendering map...</Text>
            </View>
          )}
        />
      </View>

      {!filteredSpots.length ? (
        <View style={styles.emptyMapCard}>
          <MaterialCommunityIcons name="map-marker-off-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.emptyMapText}>
            No spots match the current map filters. Switch back to All Spots or another category.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
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
    backgroundColor: colors.background,
  },
  headerTitle: { fontSize: 34, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1 },
  headerSub: { color: colors.textSecondary, fontWeight: '600', fontSize: 14, marginTop: 6 },
  toolbarRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  toolbarChip: {
    minWidth: 108,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarChipActive: { backgroundColor: colors.card, borderColor: 'transparent' },
  toolbarChipText: { color: colors.textSecondary, fontWeight: '800', fontSize: 12 },
  toolbarChipTextActive: { color: colors.textDark },
  filterTrigger: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterTriggerActive: {
    backgroundColor: colors.card,
    borderColor: 'transparent',
  },
  filterTriggerText: { color: colors.textPrimary, fontWeight: '800', fontSize: 12 },
  filterTriggerTextActive: { color: colors.textDark },
  filterPanel: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  filterPanelLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  filterOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  countryChip: {
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  countryChipActive: { backgroundColor: colors.card, borderColor: 'transparent' },
  countryChipText: { color: colors.textSecondary, fontWeight: '800', fontSize: 12 },
  countryChipTextActive: { color: colors.textDark },
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
  mapWrap: {
    flex: 1,
    backgroundColor: '#ead9c1',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: { flex: 1, backgroundColor: '#ead9c1' },
  webLoadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ead9c1',
    gap: 8,
  },
  webLoadingText: { color: colors.textSecondary, fontSize: 13 },
  emptyMapCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    ...shadow,
  },
  emptyMapText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
