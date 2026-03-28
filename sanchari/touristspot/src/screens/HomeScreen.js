import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  ScrollView,
  Dimensions,
  Keyboard,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import { spotsAPI, favoritesAPI, BASE_URL } from '../api';
import { useAuth } from '../utils/AuthContext';

const { width, height } = Dimensions.get('window');
const HOME_SPOTS_CACHE_KEY = 'home_spots_cache_v2';

const CATEGORIES = [
  { key: 'All', emoji: '🌍' },
  { key: 'Landmark', emoji: '🗼' },
  { key: 'Temple', emoji: '🛕' },
  { key: 'Nature', emoji: '🌿' },
  { key: 'Beach', emoji: '🏖️' },
  { key: 'Historical', emoji: '🏛️' },
  { key: 'General', emoji: '📍' },
];

const CATEGORY_COLORS = {
  Landmark: '#e94560',
  Historical: '#f39c12',
  Nature: '#27ae60',
  Beach: '#3498db',
  General: '#9b59b6',
  Temple: '#e67e22',
};

function getCategoryEmoji(category) {
  if (category === 'Beach') return '🏖️';
  if (category === 'Nature') return '🌿';
  if (category === 'Historical') return '🏛️';
  if (category === 'Landmark') return '🗼';
  if (category === 'Temple') return '🛕';
  return '📍';
}

function uniqueById(items) {
  const map = new Map();
  items.forEach(item => {
    if (item?.id && !map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}

function getSpotImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${BASE_URL}/uploads/${imageUrl}`;
}

export default function HomeScreen({ navigation }) {
  const { isLoggedIn, user } = useAuth();
  const [spots, setSpots] = useState([]);
  const [catalogSpots, setCatalogSpots] = useState([]);
  const [trending, setTrending] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [category, setCategory] = useState('All');
  const [activeFilter, setActiveFilter] = useState('All');
  const [cityName, setCityName] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [trendingIndex, setTrendingIndex] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(140);
  const trendingRef = useRef(null);
  const trendingTimer = useRef(null);

  useEffect(() => {
    hydrateCachedSpots();
    getUserLocation();
    loadTrending();
    loadPendingCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!search && category === 'All') {
        loadSpots(1, true);
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, search, category]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadSpots(1, true);
    }, search ? 180 : 0);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (trending.length > 0) {
      trendingTimer.current = setInterval(() => {
        setTrendingIndex(prev => {
          const next = (prev + 1) % Math.min(trending.length, 5);
          trendingRef.current?.scrollToIndex({ index: next, animated: true });
          return next;
        });
      }, 5000);
    }

    return () => clearInterval(trendingTimer.current);
  }, [trending]);

  async function hydrateCachedSpots() {
    try {
      const cached = await AsyncStorage.getItem(HOME_SPOTS_CACHE_KEY);
      if (!cached) return;
      const parsed = JSON.parse(cached);
      const cachedSpots = uniqueById(Array.isArray(parsed?.spots) ? parsed.spots : []);
      if (cachedSpots.length > 0) {
        setSpots(cachedSpots);
        setCatalogSpots(cachedSpots);
        setLoading(false);
      }
    } catch (error) {
      console.log('Cache hydrate error:', error);
    }
  }

  async function persistSpotCache(items) {
    try {
      await AsyncStorage.setItem(
        HOME_SPOTS_CACHE_KEY,
        JSON.stringify({ saved_at: Date.now(), spots: uniqueById(items) })
      );
    } catch (error) {
      console.log('Cache save error:', error);
    }
  }

  async function warmFullSpotCache() {
    try {
      const res = await spotsAPI.getSpots({ page: 1, limit: 500 });
      const allSpots = uniqueById(res.data.spots || []);
      if (allSpots.length > 0) {
        setCatalogSpots(allSpots);
        await persistSpotCache(allSpots);
      }
    } catch (error) {
      console.log('Warm cache error:', error);
    }
  }

  function getUserLocation() {
    Geolocation.getCurrentPosition(
      pos => {
        loadNearby(pos.coords.latitude, pos.coords.longitude);
        fetchCityName(pos.coords.latitude, pos.coords.longitude);
      },
      err => console.log('Location error:', err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function fetchCityName(lat, lon) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { 'User-Agent': 'TouristSpotApp/1.0' } }
      );
      const data = await res.json();
      const city = data.address?.city || data.address?.town || data.address?.village || '';
      const state = data.address?.state || '';
      if (city && state) setCityName(`${city}, ${state}`);
      else if (city) setCityName(city);
      else if (state) setCityName(state);
    } catch (error) {
      console.log('Geocoding error:', error);
    }
  }

  async function loadSpots(pageNum = 1, reset = false) {
    if (!reset && !hasMore) return;

    try {
      if (reset) setLoading(true);
      const params = { page: pageNum, limit: 20 };
      if (search) params.search = search;
      if (category !== 'All') params.category = category;

      const res = await spotsAPI.getSpots(params);
      const newSpots = uniqueById(res.data.spots || []);
      const mergedSpots = reset ? newSpots : uniqueById([...spots, ...newSpots]);

      setSpots(mergedSpots);
      setHasMore(newSpots.length === 20);
      setPage(pageNum);
      setShowSuggestions(search.length > 1 && newSpots.length > 0);

      if (!search && category === 'All' && reset) {
        setCatalogSpots(mergedSpots);
        await persistSpotCache(mergedSpots);
        warmFullSpotCache();
      }
    } catch (error) {
      console.error('Load spots error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadTrending() {
    try {
      const res = await spotsAPI.getTrending({ limit: 5 });
      setTrending(uniqueById(res.data.spots || []));
    } catch (error) {}
  }

  async function loadNearby(lat, lon) {
    if (!lat || !lon) return;
    try {
      const res = await spotsAPI.getNearby(lat, lon);
      setNearby(uniqueById(res.data.spots || []));
    } catch (error) {}
  }

  async function loadPendingCount() {
    try {
      const res = await spotsAPI.getPendingSpots();
      setPendingCount(res.data.spots?.length || 0);
    } catch (error) {}
  }

  async function toggleFavorite(spot) {
    if (!isLoggedIn) return navigation.navigate('Login');
    try {
      if (spot.is_favorite) {
        await favoritesAPI.removeFavorite(spot.id);
      } else {
        await favoritesAPI.addFavorite(spot.id);
      }
      setSpots(prev => prev.map(item =>
        item.id === spot.id ? { ...item, is_favorite: !item.is_favorite } : item
      ));
    } catch (error) {}
  }

  function handleSearchChange(text) {
    setSearch(text);
    setShowSuggestions(text.length > 1);
  }

  function handleSuggestionPress(suggestion) {
    setSearch(suggestion.name);
    setShowSuggestions(false);
    Keyboard.dismiss();
    navigation.navigate('SpotDetail', { spotId: suggestion.id, spotName: suggestion.name });
  }

  function getFilteredSpots() {
    if (activeFilter === 'Nearby') return nearby;
    if (activeFilter === 'Trending') return trending;
    return spots;
  }

  function renderTrendingItem({ item, index }) {
    const emoji = getCategoryEmoji(item.category);

    return (
      <TouchableOpacity
        style={[styles.trendingBanner, { width: width - 28 }]}
        activeOpacity={0.92}
        onPress={() => navigation.navigate('SpotDetail', { spotId: item.id, spotName: item.name })}
      >
        <Text style={styles.trendingBannerEmoji}>{emoji}</Text>
        <View style={styles.trendingBadge}>
          <Text style={styles.trendingBadgeText}>🔥 TRENDING #{index + 1}</Text>
        </View>
        <Text style={styles.trendingTitle} numberOfLines={1}>{item.name}</Text>
        <View style={styles.trendingSub}>
          <Text style={styles.trendingLocation}>{item.city}, {item.country}</Text>
          <View style={styles.trendingViews}>
            <Text style={styles.trendingViewsText}>👁️ {item.view_count || 0} views</Text>
          </View>
        </View>
        <View style={styles.exploreBtn}>
          <Text style={styles.exploreBtnText}>Explore now →</Text>
        </View>
        <View style={styles.dots}>
          {Array.from({ length: Math.min(trending.length, 5) }).map((_, i) => (
            <View key={`dot-${i}`} style={[styles.dot, trendingIndex === i && styles.dotActive]} />
          ))}
        </View>
      </TouchableOpacity>
    );
  }

  function renderSpotCard({ item }) {
    const color = CATEGORY_COLORS[item.category] || '#e94560';
    const emoji = getCategoryEmoji(item.category);
    const imageUrl = getSpotImageUrl(item.image_url);

    return (
      <TouchableOpacity
        style={styles.spotCard}
        onPress={() => navigation.navigate('SpotDetail', { spotId: item.id, spotName: item.name })}
        activeOpacity={0.88}
      >
        <View style={[styles.spotImgContainer, { backgroundColor: color + '18' }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.spotImg} resizeMode="cover" />
          ) : (
            <View style={[styles.spotLogo, { backgroundColor: color }]}>
              <Text style={styles.spotEmoji}>{emoji}</Text>
            </View>
          )}
          {item.view_count > 0 && (
            <View style={[styles.spotTag, { backgroundColor: '#e94560' }]}>
              <Text style={styles.spotTagText}>🔥 Trending</Text>
            </View>
          )}
        </View>
        <View style={styles.spotInfo}>
          <Text style={styles.spotName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.spotLoc} numberOfLines={1}>📍 {item.city}, {item.country} · {item.category}</Text>
          <View style={styles.spotMeta}>
            <Text style={styles.spotPhotos}>📸 {item.photo_count} photos</Text>
            <View style={styles.gpsTag}>
              <Text style={styles.gpsTagText}>⚡ GPS Verified</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.favBtn} onPress={() => toggleFavorite(item)}>
          <Text style={styles.favEmoji}>{item.is_favorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  const filteredSuggestions = uniqueById(
    (catalogSpots.length ? catalogSpots : spots).filter(suggestion =>
      suggestion.name?.toLowerCase().includes(search.toLowerCase()) ||
      suggestion.city?.toLowerCase().includes(search.toLowerCase())
    )
  ).slice(0, 8);

  const suggestionsMaxHeight = Math.max(180, height - keyboardHeight - headerHeight - 20);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d1a" />

      <View style={styles.header} onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}>
        <View style={styles.headerTop}>
          <View>
            <View style={styles.locationRow}>
              <Text style={styles.locationPin}>📍</Text>
              <Text style={styles.locationCity}>My Location</Text>
              <Text style={styles.locationArrow}>▼</Text>
            </View>
            <Text style={styles.locationSub}>{cityName || 'Fetching location...'}</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('PendingSpots')}>
              <Text style={styles.iconBtnText}>🔔</Text>
              {pendingCount > 0 && <View style={styles.notifDot} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'R'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder='Search "spots, beaches, temples..."'
            placeholderTextColor="#666"
            value={search}
            onChangeText={handleSearchChange}
            onFocus={() => search.length > 1 && setShowSuggestions(true)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setShowSuggestions(false); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <View
          style={[
            styles.suggestionsContainer,
            {
              top: headerHeight + 4,
              maxHeight: suggestionsMaxHeight,
              bottom: keyboardHeight ? keyboardHeight + 8 : undefined,
            },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {filteredSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion.id}-${index}`}
                style={[styles.suggestionItem, index < filteredSuggestions.length - 1 && styles.suggestionBorder]}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.suggestionEmoji}>🔍</Text>
                <View>
                  <Text style={styles.suggestionName}>{suggestion.name}</Text>
                  <Text style={styles.suggestionCity}>📍 {suggestion.city}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={getFilteredSpots()}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderSpotCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSpots(1, true);
              loadTrending();
              loadPendingCount();
            }}
            tintColor="#e94560"
          />
        }
        onEndReached={() => loadSpots(page + 1)}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={() => (
          <>
            {trending.length > 0 && (
              <View style={styles.trendingSection}>
                <FlatList
                  ref={trendingRef}
                  data={trending.slice(0, 5)}
                  keyExtractor={(item, index) => `${item.id}-${index}`}
                  renderItem={renderTrendingItem}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={event => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / (width - 28));
                    setTrendingIndex(index);
                    clearInterval(trendingTimer.current);
                    trendingTimer.current = setInterval(() => {
                      setTrendingIndex(prev => {
                        const next = (prev + 1) % Math.min(trending.length, 5);
                        trendingRef.current?.scrollToIndex({ index: next, animated: true });
                        return next;
                      });
                    }, 5000);
                  }}
                  getItemLayout={(_, index) => ({
                    length: width - 28,
                    offset: (width - 28) * index,
                    index,
                  })}
                />
              </View>
            )}

            {pendingCount > 0 && (
              <TouchableOpacity style={styles.notifBar} onPress={() => navigation.navigate('PendingSpots')}>
                <View style={styles.notifIcon}>
                  <Text style={styles.notifIconText}>📍</Text>
                </View>
                <View style={styles.notifText}>
                  <Text style={styles.notifTitle}>{pendingCount} New Spot{pendingCount > 1 ? 's' : ''} Need Approval!</Text>
                  <Text style={styles.notifSub}>Review & vote on user-submitted spots</Text>
                </View>
                <View style={styles.notifBtn}>
                  <Text style={styles.notifBtnText}>Review</Text>
                </View>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>CATEGORIES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={styles.catItem}
                  onPress={() => setCategory(cat.key)}
                >
                  <View style={[styles.catIcon, category === cat.key ? styles.catIconActive : styles.catIconInactive]}>
                    <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  </View>
                  <Text style={[styles.catLabel, category === cat.key && styles.catLabelActive]}>{cat.key}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
              {['All', 'Nearby', 'New Spots', 'Trending', 'Top Rated'].map(filter => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
                    {filter === 'All' ? '🔽 ' : filter === 'Nearby' ? '⚡ ' : filter === 'New Spots' ? '🆕 ' : filter === 'Trending' ? '🔥 ' : '⭐ '}
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>RECOMMENDED FOR YOU</Text>
          </>
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔭</Text>
              <Text style={styles.emptyText}>No spots found</Text>
            </View>
          )
        }
        ListFooterComponent={loading ? <ActivityIndicator color="#e94560" style={styles.footerLoader} /> : null}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('SubmitSpot')}>
        <Text style={styles.fabText}>+ Add Spot</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { backgroundColor: '#0d0d1a', paddingTop: 48, paddingHorizontal: 20, paddingBottom: 14 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationPin: { fontSize: 14 },
  locationCity: { fontSize: 16, fontWeight: '700', color: '#fff' },
  locationArrow: { fontSize: 10, color: '#e94560', marginLeft: 2 },
  locationSub: { fontSize: 12, color: '#e94560', marginTop: 3, fontWeight: '600' },
  headerIcons: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: {
    width: 38, height: 38, backgroundColor: '#1e1e2e',
    borderRadius: 19, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  iconBtnText: { fontSize: 16 },
  notifDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, backgroundColor: '#e94560',
    borderRadius: 4, borderWidth: 2, borderColor: '#0d0d1a',
  },
  avatar: {
    width: 38, height: 38, backgroundColor: '#e94560',
    borderRadius: 19, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  searchBar: {
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  clearBtn: { color: '#888', fontSize: 16 },
  suggestionsContainer: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: '#1a1a2e', borderRadius: 14,
    zIndex: 999, elevation: 20,
    borderWidth: 1, borderColor: '#2a2a3e',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10,
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: '#2a2a3e' },
  suggestionEmoji: { fontSize: 16 },
  suggestionName: { fontSize: 14, fontWeight: '600', color: '#fff' },
  suggestionCity: { fontSize: 11, color: '#888', marginTop: 2 },
  trendingSection: { paddingHorizontal: 14, paddingTop: 14 },
  trendingBanner: {
    backgroundColor: '#0f1f3d', borderRadius: 22, padding: 20,
    minHeight: 160, position: 'relative', overflow: 'hidden',
    borderWidth: 1, borderColor: '#e9456022', marginRight: 0,
  },
  trendingBannerEmoji: {
    position: 'absolute', right: -10, top: -10,
    fontSize: 110, opacity: 0.12,
  },
  trendingBadge: {
    backgroundColor: '#e94560', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4,
    alignSelf: 'flex-start', marginBottom: 10,
  },
  trendingBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  trendingTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 6 },
  trendingSub: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  trendingLocation: { fontSize: 12, color: '#888' },
  trendingViews: {
    backgroundColor: 'rgba(233,69,96,0.15)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  trendingViewsText: { fontSize: 11, color: '#e94560', fontWeight: '600' },
  exploreBtn: {
    backgroundColor: '#e94560', borderRadius: 22,
    paddingHorizontal: 22, paddingVertical: 9, alignSelf: 'flex-start',
  },
  exploreBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  dots: { position: 'absolute', bottom: 14, right: 16, flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  dotActive: { width: 18, borderRadius: 3, backgroundColor: '#e94560' },
  notifBar: {
    margin: 14, marginBottom: 0, backgroundColor: '#0f1f14',
    borderRadius: 16, padding: 12, flexDirection: 'row',
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#27ae6033',
  },
  notifIcon: {
    width: 40, height: 40, backgroundColor: '#27ae60',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  notifIconText: { fontSize: 18 },
  notifText: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '700', color: '#2ecc71' },
  notifSub: { fontSize: 11, color: '#666', marginTop: 2 },
  notifBtn: {
    backgroundColor: '#27ae60', borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 7,
  },
  notifBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  sectionTitle: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10,
    fontSize: 11, fontWeight: '700', color: '#555', letterSpacing: 1.5,
  },
  categoriesRow: { paddingHorizontal: 16, gap: 14, paddingBottom: 4 },
  catItem: { alignItems: 'center', gap: 7 },
  catIcon: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catIconActive: { backgroundColor: '#e94560' },
  catIconInactive: { backgroundColor: '#1a1a2e', borderWidth: 1.5, borderColor: '#2a2a3e' },
  catEmoji: { fontSize: 28 },
  catLabel: { fontSize: 11, color: '#aaa', fontWeight: '600' },
  catLabelActive: { color: '#e94560' },
  filtersRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  filterChip: {
    backgroundColor: '#1a1a2e', borderRadius: 22,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  filterChipActive: { backgroundColor: '#e9456018', borderColor: '#e94560' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#ccc' },
  filterChipTextActive: { color: '#e94560' },
  listContent: { paddingBottom: 100 },
  spotCard: {
    backgroundColor: '#1a1a2e', borderRadius: 20,
    marginHorizontal: 16, marginBottom: 12,
    flexDirection: 'row', overflow: 'hidden',
    minHeight: 110,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  spotImgContainer: {
    width: 110, height: 110,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
    flexShrink: 0,
  },
  spotImg: { width: '100%', height: '100%' },
  spotLogo: {
    width: 70, height: 70, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  spotEmoji: { fontSize: 34 },
  spotTag: {
    position: 'absolute', top: 8, left: 8,
    borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3,
  },
  spotTagText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  spotInfo: { flex: 1, padding: 13, justifyContent: 'center' },
  spotName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  spotLoc: { fontSize: 11, color: '#777', marginBottom: 8 },
  spotMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spotPhotos: { fontSize: 11, color: '#555' },
  gpsTag: {
    backgroundColor: '#e9456015', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  gpsTagText: { fontSize: 11, color: '#e94560', fontWeight: '600' },
  favBtn: { padding: 12, justifyContent: 'center' },
  favEmoji: { fontSize: 18 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 52 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 12 },
  footerLoader: { padding: 20 },
  fab: {
    position: 'absolute', bottom: 80, right: 20,
    backgroundColor: '#e94560', borderRadius: 25,
    paddingHorizontal: 20, paddingVertical: 12, elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
