import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { radius, shadow, typography } from '../theme';
import { useAppTheme } from '../theme/ThemeProvider';

const { width, height } = Dimensions.get('window');
const HOME_SPOTS_CACHE_KEY = 'home_spots_cache_v2';

const CATEGORIES = [
  { key: 'All', emoji: '🌍' },
  { key: 'Landmark', emoji: '🗼' },
  { key: 'Temple', emoji: '🛕' },
  { key: 'Nature', emoji: '🌿' },
  { key: 'Trekking', emoji: '🥾' },
  { key: 'Beach', emoji: '🏖️' },
  { key: 'Historical', emoji: '🏛️' },
  { key: 'General', emoji: '📍' },
];

const CATEGORY_COLORS = {
  Landmark: '#e94560',
  Historical: '#f39c12',
  Nature: '#27ae60',
  Trekking: '#d97706',
  Beach: '#3498db',
  General: '#9b59b6',
  Temple: '#e67e22',
};

function getCategoryEmoji(category) {
  if (category === 'Beach') return '🏖️';
  if (category === 'Nature') return '🌿';
  if (category === 'Trekking') return '🥾';
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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    const imageUrl = getSpotImageUrl(item.image_url);

    return (
      <TouchableOpacity
        style={[styles.trendingBanner, { width: width - 28 }]}
        activeOpacity={0.92}
        onPress={() => navigation.navigate('SpotDetail', { spotId: item.id, spotName: item.name })}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.trendingImage} resizeMode="cover" />
        ) : (
          <View style={styles.trendingImageFallback}>
            <Text style={styles.trendingBannerEmoji}>{emoji}</Text>
          </View>
        )}
        <View style={styles.trendingOverlay} />
        <View style={styles.trendingBadge}>
          <Text style={styles.trendingBadgeText}>Trending #{index + 1}</Text>
        </View>
        <View style={styles.trendingContent}>
          <Text style={styles.trendingTitle} numberOfLines={2}>{item.name}</Text>
          <View style={styles.trendingSub}>
            <Text style={styles.trendingLocation}>{item.city}, {item.country}</Text>
            <View style={styles.trendingViews}>
              <Text style={styles.trendingViewsText}>{item.view_count || 0} views</Text>
            </View>
          </View>
          <View style={styles.exploreBtn}>
            <Text style={styles.exploreBtnText}>Open spot</Text>
          </View>
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
          <Text style={styles.spotLoc} numberOfLines={1}>{item.city}, {item.country}</Text>
          <View style={styles.spotMeta}>
            <Text style={styles.spotPhotos}>{item.category}</Text>
            <View style={styles.gpsTag}>
              <Text style={styles.gpsTagText}>{item.photo_count} photos</Text>
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
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header} onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.brandKicker}>Aawara</Text>
            <Text style={styles.locationCity}>Plan your trip</Text>
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
            placeholder='Search spots, beaches, temples...'
            placeholderTextColor={colors.textMuted}
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
            tintColor={colors.card}
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

            <Text style={styles.sectionTitle}>Categories</Text>
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

            <Text style={styles.sectionTitle}>Recommended For You</Text>
          </>
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>A</Text>
              <Text style={styles.emptyText}>No spots found</Text>
            </View>
          )
        }
        ListFooterComponent={loading ? <ActivityIndicator color={colors.card} style={styles.footerLoader} /> : null}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('SubmitSpot')}>
        <Text style={styles.fabText}>+ Add Spot</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.background, paddingTop: 48, paddingHorizontal: 20, paddingBottom: 14 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  brandKicker: { color: colors.primary, fontSize: typography.micro, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  locationCity: { fontSize: typography.display, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1.2, marginTop: 4 },
  locationSub: { fontSize: typography.label, color: colors.textSecondary, marginTop: 6, fontWeight: '600' },
  headerIcons: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: {
    width: 42, height: 42, backgroundColor: colors.surface,
    borderRadius: 21, alignItems: 'center', justifyContent: 'center', position: 'relative',
    borderWidth: 1, borderColor: colors.border,
  },
  iconBtnText: { fontSize: 16 },
  notifDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, backgroundColor: colors.primary,
    borderRadius: 4, borderWidth: 2, borderColor: colors.background,
  },
  avatar: {
    width: 42, height: 42, backgroundColor: colors.card,
    borderRadius: 21, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.textDark, fontWeight: '800', fontSize: 15 },
  searchBar: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  clearBtn: { color: colors.textMuted, fontSize: 16 },
  suggestionsContainer: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    zIndex: 999, elevation: 20,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10,
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionEmoji: { fontSize: 16 },
  suggestionName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  suggestionCity: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  trendingSection: { paddingHorizontal: 14, paddingTop: 14 },
  trendingBanner: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    minHeight: 270,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 0,
    ...shadow,
  },
  trendingImage: { ...StyleSheet.absoluteFillObject },
  trendingImageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingBannerEmoji: {
    fontSize: 100, opacity: 0.16,
  },
  trendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,8,9,0.28)',
  },
  trendingBadge: {
    position: 'absolute',
    top: 18,
    left: 18,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  trendingBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  trendingContent: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  trendingTitle: { fontSize: typography.title, fontWeight: '500', color: colors.white, marginBottom: 8, letterSpacing: -1.1, fontStyle: 'italic' },
  trendingSub: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  trendingLocation: { fontSize: 13, color: colors.white },
  trendingViews: {
    backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  trendingViewsText: { fontSize: 11, color: colors.white, fontWeight: '700' },
  exploreBtn: {
    backgroundColor: colors.card, borderRadius: 22,
    paddingHorizontal: 20, paddingVertical: 11, alignSelf: 'flex-start',
  },
  exploreBtnText: { color: colors.textDark, fontSize: 13, fontWeight: '800' },
  dots: { position: 'absolute', bottom: 14, right: 16, flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.46)' },
  dotActive: { width: 18, borderRadius: 3, backgroundColor: colors.card },
  notifBar: {
    margin: 14, marginBottom: 0, backgroundColor: colors.surface,
    borderRadius: 16, padding: 12, flexDirection: 'row',
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border,
  },
  notifIcon: {
    width: 40, height: 40, backgroundColor: colors.cardMuted,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  notifIconText: { fontSize: 18 },
  notifText: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  notifSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  notifBtn: {
    backgroundColor: colors.card, borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 7,
  },
  notifBtnText: { color: colors.textDark, fontSize: 11, fontWeight: '800' },
  sectionTitle: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10,
    fontSize: typography.label, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.8,
  },
  categoriesRow: { paddingHorizontal: 16, gap: 14, paddingBottom: 4 },
  catItem: { alignItems: 'center', gap: 7 },
  catIcon: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catIconActive: { backgroundColor: colors.card },
  catIconInactive: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  catEmoji: { fontSize: 28 },
  catLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  catLabelActive: { color: colors.card },
  filtersRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  filterChip: {
    backgroundColor: colors.surface, borderRadius: 22,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.card, borderColor: 'transparent' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  filterChipTextActive: { color: colors.textDark },
  listContent: { paddingBottom: 100 },
  spotCard: {
    backgroundColor: colors.surface, borderRadius: 24,
    marginHorizontal: 16, marginBottom: 12,
    flexDirection: 'row', overflow: 'hidden',
    minHeight: 110,
    borderWidth: 1, borderColor: colors.border,
    ...shadow,
  },
  spotImgContainer: {
    width: 116, height: 118,
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
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: colors.primary,
  },
  spotTagText: { color: '#fff', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  spotInfo: { flex: 1, padding: 15, justifyContent: 'center' },
  spotName: { fontSize: 22, fontWeight: '500', color: colors.textPrimary, marginBottom: 5, letterSpacing: -1, fontStyle: 'italic' },
  spotLoc: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  spotMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  spotPhotos: { fontSize: 11, color: colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700' },
  gpsTag: {
    backgroundColor: colors.backgroundAlt, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  gpsTagText: { fontSize: 11, color: colors.textSecondary, fontWeight: '700' },
  favBtn: { padding: 12, justifyContent: 'center' },
  favEmoji: { fontSize: 18 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: {
    fontSize: 34,
    color: colors.textDark,
    width: 70,
    height: 70,
    borderRadius: 35,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 12 },
  footerLoader: { padding: 20 },
  fab: {
    position: 'absolute', bottom: 100, right: 20,
    backgroundColor: colors.card, borderRadius: 25,
    paddingHorizontal: 20, paddingVertical: 12, elevation: 8,
  },
  fabText: { color: colors.textDark, fontWeight: '800', fontSize: 14 },
});
