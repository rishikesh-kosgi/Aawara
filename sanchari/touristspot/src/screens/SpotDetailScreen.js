import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  FlatList,
  Image,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import Geolocation from 'react-native-geolocation-service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { spotsAPI, photosAPI, favoritesAPI, groupsAPI } from '../api';
import { BASE_URL } from '../api';
import { useAuth } from '../utils/AuthContext';
import Pill from '../components/ui/Pill';
import PrimaryButton from '../components/ui/PrimaryButton';
import { radius, shadow, spacing, typography } from '../theme';
import { useAppTheme } from '../theme/ThemeProvider';

const { width, height } = Dimensions.get('window');
const HERO_HEIGHT = Math.round(height * 0.75);
const BASIC_HEIGHT = Math.round(height * 0.25);

const FLAG_REASONS = [
  { key: 'selfie', label: 'Selfie / Person in photo' },
  { key: 'blurry', label: 'Blurry image' },
  { key: 'blank', label: 'Blank / No content' },
  { key: 'not_location', label: 'Not this location' },
  { key: 'inappropriate', label: 'Inappropriate content' },
];

function getPhotoUrl(filename) {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `${BASE_URL}/uploads/${filename}`;
}

function formatPhotoTime(timestamp) {
  if (!timestamp) return 'Unknown';
  const ms = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPhotoBadge(photo) {
  return photo?.is_sample ? 'Sample photo' : formatPhotoTime(photo?.uploaded_at);
}

async function requestPermissions() {
  if (Platform.OS === 'android') {
    const camera = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'Camera Permission',
      message: 'App needs camera to capture location photos.',
    });
    const location = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
      title: 'Location Permission',
      message: 'App needs your location to verify you are at this spot.',
    });
    return camera === PermissionsAndroid.RESULTS.GRANTED && location === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => resolve(position.coords),
      error => reject(error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

function getStatusInfo(spot) {
  const totalPhotos = spot?.photo_count || 0;
  return [
    { key: 'snow', label: 'Snow Level', value: totalPhotos > 7 ? 'High' : totalPhotos > 3 ? 'Medium' : 'Low', tone: totalPhotos > 7 ? 'warning' : 'success' },
    { key: 'water', label: 'Water Flow', value: totalPhotos > 5 ? 'Strong' : 'Steady', tone: totalPhotos > 5 ? 'primary' : 'default' },
    { key: 'visibility', label: 'Visibility', value: totalPhotos > 0 ? 'Good' : 'Unknown', tone: totalPhotos > 0 ? 'success' : 'default' },
  ];
}

function getUploadRejectText(payload) {
  const failedRule = payload?.failed_rule;
  const checks = Array.isArray(payload?.checks) ? payload.checks : [];
  const failed = checks.find(c => c?.rule === failedRule) || checks.find(c => c?.passed === false);
  switch (failedRule) {
    case 'dimension_min_400x400': return 'Photo rejected: image is too small.';
    case 'blank_pixel_variance': return 'Photo rejected: image looks blank.';
    case 'brightness_not_too_dark': return 'Photo rejected: image is too dark.';
    case 'blur_laplacian_sharpness': return 'Photo rejected: image is blurry.';
    case 'selfie_face_ratio': return 'Photo rejected: selfie detected.';
    default:
      if (failed?.rejectMessage) return `Photo rejected: ${failed.rejectMessage}`;
      return payload?.message || 'Photo rejected. Please retake and try again.';
  }
}

export default function SpotDetailScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { spotId, spotName } = route.params;
  const { isLoggedIn, refreshUser } = useAuth();
  const [spot, setSpot] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [showPending, setShowPending] = useState(false);
  const [voting, setVoting] = useState(false);
  const [flagModalPhoto, setFlagModalPhoto] = useState(null);
  const [reviewPhoto, setReviewPhoto] = useState(null);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);
  const [visitSyncing, setVisitSyncing] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groups, setGroups] = useState([]);
  const [sharingToGroup, setSharingToGroup] = useState(false);
  const fullListRef = useRef(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotId]);

  useEffect(() => {
    setHeroPhotoIndex(0);
  }, [spotId, photos.length]);

  useEffect(() => {
    if (!spot || !isLoggedIn || spot.is_visited || visitSyncing) return;
    markVisitedIfNearby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot?.id, spot?.is_visited, isLoggedIn]);

  async function loadData() {
    try {
      const [spotRes, photosRes] = await Promise.all([
        spotsAPI.getSpot(spotId),
        photosAPI.getPhotos(spotId),
      ]);
      setSpot(spotRes.data.spot);
      setPhotos(photosRes.data.photos || []);
      if (isLoggedIn) {
        const pendingRes = await photosAPI.getPendingPhotos(spotId);
        setPendingPhotos(pendingRes.data.photos || []);
      }
    } catch (error) {
      console.log('Spot detail load error:', error?.response?.data || error.message);
      Alert.alert('Error', 'Failed to load spot details');
    } finally {
      setLoading(false);
    }
  }

  async function markVisitedIfNearby() {
    if (!spot) return;
    setVisitSyncing(true);
    try {
      const coords = await getCurrentLocation();
      const response = await spotsAPI.markVisited(spot.id, coords.latitude, coords.longitude);
      setSpot(prev => prev ? ({
        ...prev,
        is_visited: true,
        visited_at: response.data?.visited?.last_visited_at || prev.visited_at,
        visit_count: response.data?.visited?.visit_count || Math.max(prev.visit_count || 0, 1),
      }) : prev);
      if (response.data?.points_awarded) {
        refreshUser(false);
      }
    } catch (error) {
      // Visit tracking is best-effort only.
    } finally {
      setVisitSyncing(false);
    }
  }

  async function toggleFavorite() {
    if (!isLoggedIn) return navigation.navigate('Login');
    if (!spot) return;
    try {
      if (spot.is_favorite) {
        await favoritesAPI.removeFavorite(spot.id);
      } else {
        await favoritesAPI.addFavorite(spot.id);
      }
      setSpot(prev => ({ ...prev, is_favorite: !prev.is_favorite }));
    } catch (error) {}
  }

  async function openGroupShareModal() {
    if (!isLoggedIn) return navigation.navigate('Login');
    setSharingToGroup(true);
    try {
      const response = await groupsAPI.getGroups();
      setGroups(response.data?.groups || []);
      setGroupModalVisible(true);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load groups');
    } finally {
      setSharingToGroup(false);
    }
  }

  async function shareSpotToGroup(groupId, groupName) {
    try {
      await groupsAPI.suggestSpot(groupId, spotId);
      setGroupModalVisible(false);
      Alert.alert('Shared', `${spot?.name || spotName} was suggested in ${groupName}.`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to share spot');
    }
  }

  async function handleVoteRemote() {
    if (!isLoggedIn) return navigation.navigate('Login');
    setVoting(true);
    try {
      const res = await spotsAPI.voteRemote(spotId);
      Alert.alert('Vote recorded', res.data.message);
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Vote failed');
    } finally {
      setVoting(false);
    }
  }

  async function handleCapturePhoto() {
    if (!isLoggedIn) return navigation.navigate('Login');
    if (spot?.cooldown?.active) {
      return Alert.alert('Cooldown active', `Try again in ${spot.cooldown.remaining_minutes} minute(s).`);
    }
    const granted = await requestPermissions();
    if (!granted) {
      return Alert.alert('Permission required', 'Camera and location permissions are required.');
    }

    setUploadStatus('Checking location...');
    let coords;
    try {
      coords = await getCurrentLocation();
    } catch (error) {
      setUploadStatus('');
      return Alert.alert('Location error', 'Unable to fetch GPS location.');
    }

    Alert.alert(
      'Photo Guidelines',
      `Capture only real scenery.\n\nGPS: ${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setUploadStatus('') },
        { text: 'Open Camera', onPress: () => openCamera(coords) },
      ]
    );
  }

  async function openCamera(coords) {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.9,
      maxWidth: 1200,
      maxHeight: 900,
      saveToPhotos: false,
    });
    if (result.didCancel || result.errorCode) {
      setUploadStatus('');
      return;
    }
    const image = result.assets?.[0];
    if (!image) {
      setUploadStatus('');
      return;
    }
    uploadPhoto(image, coords);
  }

  async function uploadPhoto(image, coords) {
    setUploading(true);
    setUploadStatus('Uploading...');
    try {
      await photosAPI.uploadPhotoWithLocation(spotId, image, coords.latitude, coords.longitude);
      setUploadStatus('');
      refreshUser(false);
      Alert.alert('Uploaded', 'Your photo is pending community review.');
      loadData();
    } catch (error) {
      setUploadStatus('');
      const payload = error.response?.data;
      Alert.alert('Upload failed', getUploadRejectText(payload));
    } finally {
      setUploading(false);
    }
  }

  async function approvePhoto(photoId) {
    try {
      await photosAPI.approvePhoto(photoId);
      setReviewPhoto(null);
      Alert.alert('Approved', 'Photo added to gallery.');
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Approval failed');
    }
  }

  async function flagPhoto(photoId, reason) {
    try {
      await photosAPI.flagPhoto(photoId, reason);
      setFlagModalPhoto(null);
      setReviewPhoto(null);
      Alert.alert('Reported', 'Thanks for reporting.');
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Flagging failed');
    }
  }

  function openFullscreenAt(index) {
    setSelectedPhotoIndex(index);
    setFullscreenVisible(true);
    setTimeout(() => {
      fullListRef.current?.scrollToIndex({ index, animated: false });
    }, 80);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!spot) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Spot not found</Text>
      </View>
    );
  }

  const statusInfo = getStatusInfo(spot);
  const firstPhoto = photos[0];
  const realPhotoCount = photos.filter(photo => !photo.is_sample).length;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          {photos.length > 0 ? (
            <>
              <FlatList
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id}
                onMomentumScrollEnd={(event) => {
                  const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                  setHeroPhotoIndex(nextIndex);
                }}
                renderItem={({ item, index }) => (
                  <Pressable style={styles.heroSlide} onPress={() => openFullscreenAt(index)}>
                    <Image
                      source={{ uri: getPhotoUrl(item.filename) }}
                      style={styles.heroImage}
                      resizeMode="cover"
                    />
                  </Pressable>
                )}
              />
              <View style={styles.heroStamp}>
                <Text style={styles.heroStampText}>{getPhotoBadge(photos[heroPhotoIndex] || firstPhoto)}</Text>
              </View>
              <View style={styles.heroCounter}>
                <Text style={styles.heroCounterText}>{heroPhotoIndex + 1}/{photos.length}</Text>
              </View>
              <View style={styles.heroDots}>
                {photos.slice(0, 6).map((photo, index) => (
                  <View
                    key={photo.id}
                    style={[styles.heroDot, heroPhotoIndex === index && styles.heroDotActive]}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <MaterialCommunityIcons name="camera-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.heroPlaceholderSub}>No live photo yet</Text>
            </View>
          )}
          <View style={styles.heroTopBar}>
            <Pressable style={styles.heroIconButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.heroIconButton} onPress={toggleFavorite}>
              <MaterialCommunityIcons
                name={spot?.is_favorite ? 'heart' : 'heart-outline'}
                size={20}
                color={spot?.is_favorite ? colors.primary : colors.textPrimary}
              />
            </Pressable>
          </View>
          <View style={styles.heroDetails}>
            <Text style={styles.heroEyebrow}>{spot?.category || 'General'}</Text>
            <Text style={styles.heroTitle}>{spot?.name}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaPill}>
                <MaterialCommunityIcons name="map-marker-outline" size={15} color={colors.white} />
                <Text style={styles.heroMetaText}>{spot?.city}, {spot?.country}</Text>
              </View>
              <View style={styles.heroMetaPill}>
                <MaterialCommunityIcons name="camera-outline" size={15} color={colors.white} />
                <Text style={styles.heroMetaText}>{realPhotoCount || photos.length} photos</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.basicCard}>
          <Text style={styles.kicker}>Included in this spot</Text>
          <View style={styles.basicBadges}>
            <Pill label={spot?.category || 'General'} tone="primary" />
            <Pill label={`${spot?.photo_count || 0}/10 photos`} tone="default" />
            {realPhotoCount > 0 ? <Pill label={`${realPhotoCount} live`} tone="success" /> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusGrid}>
            {statusInfo.map(item => (
              <View key={item.key} style={styles.statusCard}>
                <Text style={styles.statusTitle}>{item.label}</Text>
                <Pill label={item.value} tone={item.tone} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{spot?.description || 'No description available.'}</Text>
          <Pressable style={styles.groupShareButton} onPress={openGroupShareModal}>
            <Text style={styles.groupShareText}>{sharingToGroup ? 'Loading groups...' : 'Share this spot in a group'}</Text>
          </Pressable>
        </View>

        {!spot?.is_remote && (
          <PrimaryButton
            label={
              spot?.has_voted_remote
                ? `Voted Remote (${spot?.remote_votes || 0}/3)`
                : voting
                ? 'Submitting vote...'
                : `Vote Remote Spot (${spot?.remote_votes || 0}/3)`
            }
            onPress={handleVoteRemote}
            disabled={voting || spot?.has_voted_remote}
            style={styles.voteButton}
          />
        )}

        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>All Photos</Text>
            <Text style={styles.countLabel}>
              {realPhotoCount > 0 ? `${realPhotoCount} photos` : firstPhoto?.is_sample ? 'Sample photo' : '0 photos'}
            </Text>
          </View>
          {photos.length === 0 ? (
            <Text style={styles.emptyText}>No approved photos yet.</Text>
          ) : (
            <FlatList
              horizontal
              data={photos}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbList}
              renderItem={({ item, index }) => (
                <Pressable style={styles.thumbCard} onPress={() => openFullscreenAt(index)}>
                  <Image source={{ uri: getPhotoUrl(item.filename) }} style={styles.thumbImage} />
                  <View style={styles.thumbStamp}>
                    <Text style={styles.thumbStampText}>{item.is_sample ? 'Sample photo' : formatPhotoTime(item.uploaded_at)}</Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Photo</Text>
          <PrimaryButton
            label={uploading ? uploadStatus || 'Uploading...' : 'Capture Photo'}
            onPress={handleCapturePhoto}
            disabled={uploading || spot?.cooldown?.active}
            loading={uploading}
            style={styles.captureBtn}
          />
          {spot?.cooldown?.active && (
            <Text style={styles.cooldownText}>⏳ Uploads reopen in {spot.cooldown.remaining_minutes} minute(s)</Text>
          )}
        </View>

        {isLoggedIn && pendingPhotos.length > 0 && (
          <View style={styles.section}>
            <Pressable style={styles.rowBetween} onPress={() => setShowPending(!showPending)}>
              <Text style={styles.sectionTitle}>Pending Review ({pendingPhotos.length})</Text>
              <Text style={styles.countLabel}>{showPending ? 'Hide' : 'Show'}</Text>
            </Pressable>
            {showPending && pendingPhotos.map(photo => (
              <View key={photo.id} style={styles.pendingCard}>
                <Pressable onPress={() => !photo.already_flagged && setReviewPhoto(photo)}>
                  <Image source={{ uri: getPhotoUrl(photo.filename) }} style={styles.pendingImage} />
                </Pressable>
                <View style={styles.pendingBody}>
                  <Text style={styles.pendingMeta}>By {photo.uploader_name || 'Anonymous'}</Text>
                  <Text style={styles.pendingMeta}>Flags: {photo.flag_count}</Text>
                  <Text style={styles.pendingMeta}>{formatPhotoTime(photo.uploaded_at)}</Text>
                  {!photo.already_flagged ? (
                    <Text style={styles.tapHint}>Tap image to review</Text>
                  ) : (
                    <Text style={styles.flaggedText}>You already flagged this</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={fullscreenVisible} transparent animationType="fade" onRequestClose={() => setFullscreenVisible(false)}>
        <View style={styles.fullscreenWrap}>
          <Pressable style={styles.closeBtn} onPress={() => setFullscreenVisible(false)}>
            <Text style={styles.closeText}>✖</Text>
          </Pressable>
          <FlatList
            ref={fullListRef}
            data={photos}
            horizontal
            pagingEnabled
            keyExtractor={item => item.id}
            initialScrollIndex={selectedPhotoIndex}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onScrollToIndexFailed={() => {}}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.fullscreenPage}>
                <Image source={{ uri: getPhotoUrl(item.filename) }} style={styles.fullscreenImage} resizeMode="contain" />
                <View style={styles.fullscreenStamp}>
                  <Text style={styles.fullscreenStampText}>{getPhotoBadge(item)}</Text>
                </View>
              </View>
            )}
          />
        </View>
      </Modal>

      <Modal visible={!!reviewPhoto} transparent animationType="fade" onRequestClose={() => setReviewPhoto(null)}>
        <View style={styles.reviewWrap}>
          <Pressable style={styles.closeBtn} onPress={() => setReviewPhoto(null)}>
            <Text style={styles.closeText}>✖</Text>
          </Pressable>
          {reviewPhoto && (
            <Image source={{ uri: getPhotoUrl(reviewPhoto.filename) }} style={styles.reviewImage} resizeMode="contain" />
          )}
          <View style={styles.reviewInfo}>
            <Text style={styles.reviewMeta}>By {reviewPhoto?.uploader_name || 'Anonymous'}</Text>
            <Text style={styles.reviewMeta}>{formatPhotoTime(reviewPhoto?.uploaded_at)}</Text>
          </View>
          <View style={styles.reviewActions}>
            <Pressable style={[styles.smallBtn, styles.approveBtn, styles.reviewBtn]} onPress={() => reviewPhoto && approvePhoto(reviewPhoto.id)}>
              <Text style={[styles.smallBtnText, styles.approveBtnText]}>Accept</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, styles.rejectBtn, styles.reviewBtn]} onPress={() => reviewPhoto && flagPhoto(reviewPhoto.id, 'not_location')}>
              <Text style={styles.smallBtnText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!flagModalPhoto} transparent animationType="slide">
        <View style={styles.flagModalBg}>
          <View style={styles.flagModalCard}>
            <Text style={styles.flagTitle}>Report photo</Text>
            {FLAG_REASONS.map(reason => (
              <Pressable key={reason.key} style={styles.flagOption} onPress={() => flagPhoto(flagModalPhoto.id, reason.key)}>
                <Text style={styles.flagOptionText}>{reason.label}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.flagCancel} onPress={() => setFlagModalPhoto(null)}>
              <Text style={styles.flagCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={groupModalVisible} transparent animationType="slide" onRequestClose={() => setGroupModalVisible(false)}>
        <View style={styles.flagModalBg}>
          <View style={styles.flagModalCard}>
            <Text style={styles.flagTitle}>Share to trip group</Text>
            {groups.length > 0 ? groups.map(group => (
              <Pressable key={group.id} style={styles.flagOption} onPress={() => shareSpotToGroup(group.id, group.name)}>
                <Text style={styles.flagOptionText}>{group.name}</Text>
                <Text style={styles.groupMetaText}>Code {group.invite_code} • {group.member_count} members</Text>
              </Pressable>
            )) : (
              <Pressable style={styles.flagOption} onPress={() => { setGroupModalVisible(false); navigation.navigate('Groups'); }}>
                <Text style={styles.flagOptionText}>No groups yet. Create one first.</Text>
              </Pressable>
            )}
            <Pressable style={styles.flagCancel} onPress={() => setGroupModalVisible(false)}>
              <Text style={styles.flagCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  notFoundText: { color: colors.textPrimary, fontSize: 16 },
  heroWrap: { height: HERO_HEIGHT, backgroundColor: colors.backgroundAlt },
  heroSlide: { width, height: HERO_HEIGHT },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  heroPlaceholderSub: { color: colors.textSecondary, marginTop: 6 },
  heroTopBar: {
    position: 'absolute',
    top: 54,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDetails: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 48,
  },
  heroEyebrow: {
    color: colors.white,
    fontSize: typography.micro,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitle: {
    color: colors.white,
    fontSize: typography.display,
    fontWeight: '500',
    letterSpacing: -1.4,
    fontStyle: 'italic',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.md,
  },
  heroMetaPill: {
    borderRadius: radius.round,
    backgroundColor: 'rgba(17,17,17,0.34)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  heroStamp: {
    position: 'absolute', left: spacing.md, bottom: spacing.md,
    backgroundColor: colors.overlay, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroStampText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  heroCounter: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    minWidth: 58,
    borderRadius: radius.round,
    backgroundColor: 'rgba(17,17,17,0.42)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  heroCounterText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  heroDots: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: spacing.md,
    flexDirection: 'row',
    gap: 6,
  },
  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  heroDotActive: {
    width: 22,
    backgroundColor: colors.card,
  },
  basicCard: {
    minHeight: BASIC_HEIGHT, padding: spacing.lg,
    backgroundColor: colors.surface, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, marginTop: -24,
    borderWidth: 1, borderColor: colors.border,
  },
  kicker: { color: colors.primary, fontSize: typography.micro, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  basicBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  section: {
    marginTop: spacing.md, marginHorizontal: spacing.md,
    borderRadius: radius.lg, padding: spacing.lg,
    backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.border, ...shadow,
  },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.heading, fontWeight: '800', letterSpacing: -0.4 },
  statusGrid: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  statusCard: {
    flex: 1, borderRadius: radius.md, padding: spacing.sm,
    backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border,
  },
  statusTitle: { color: colors.textSecondary, fontSize: 12, marginBottom: 8 },
  description: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 26, marginTop: spacing.sm },
  groupShareButton: {
    marginTop: spacing.md,
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupShareText: { color: colors.textDark, fontSize: 14, fontWeight: '800' },
  voteButton: { marginHorizontal: spacing.md, marginTop: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countLabel: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  emptyText: { color: colors.textSecondary, marginTop: spacing.sm },
  thumbList: { gap: 10, paddingTop: spacing.sm },
  thumbCard: { borderRadius: radius.md, overflow: 'hidden' },
  thumbImage: { width: 176, height: 130 },
  thumbStamp: {
    position: 'absolute', left: 6, bottom: 6,
    backgroundColor: colors.overlay, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  thumbStampText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  captureBtn: { marginTop: spacing.sm },
  cooldownText: { color: colors.warning, marginTop: 8, fontSize: 12, fontWeight: '700' },
  pendingCard: {
    marginTop: spacing.sm, borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceMuted, flexDirection: 'row',
  },
  pendingImage: { width: 100, height: 96 },
  pendingBody: { flex: 1, padding: spacing.sm, gap: 2 },
  pendingMeta: { color: colors.textSecondary, fontSize: 12 },
  tapHint: { color: colors.accent, marginTop: 6, fontSize: 12, fontWeight: '700' },
  flaggedText: { color: colors.warning, marginTop: 6, fontSize: 12 },
  smallBtn: { minHeight: 28, paddingHorizontal: 10, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { backgroundColor: colors.card },
  rejectBtn: { backgroundColor: colors.primary },
  smallBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  approveBtnText: { color: colors.textDark },
  fullscreenWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
  reviewWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center' },
  reviewImage: { width, height: height * 0.78 },
  reviewInfo: {
    position: 'absolute', left: spacing.md, bottom: 96,
    backgroundColor: colors.overlay, borderRadius: radius.md,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  reviewMeta: { color: colors.white, fontSize: 12, fontWeight: '700' },
  reviewActions: {
    position: 'absolute', left: spacing.md, right: spacing.md,
    bottom: 28, flexDirection: 'row', gap: 10,
  },
  reviewBtn: { flex: 1, minHeight: 42 },
  closeBtn: {
    position: 'absolute', right: 16, top: 52, zIndex: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  fullscreenPage: { width, height, alignItems: 'center', justifyContent: 'center' },
  fullscreenImage: { width, height: height * 0.84 },
  fullscreenStamp: {
    position: 'absolute', bottom: 70,
    backgroundColor: colors.overlay, borderRadius: radius.md,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  fullscreenStampText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  flagModalBg: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  flagModalCard: {
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface, padding: spacing.lg,
  },
  flagTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm },
  flagOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  flagOptionText: { color: colors.textPrimary, fontSize: 14 },
  groupMetaText: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  flagCancel: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  flagCancelText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
