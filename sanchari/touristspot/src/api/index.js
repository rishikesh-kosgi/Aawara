import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_TIMEOUT_MS,
  DEV_FALLBACK_BASE_URLS,
  PRODUCTION_CONFIG_URLS,
  RELEASE_FALLBACK_BASE_URLS,
} from '../config/appConfig';

const BASE_URL_STORAGE_KEY = 'api_base_url';
const FALLBACK_BASE_URLS = __DEV__ ? DEV_FALLBACK_BASE_URLS : RELEASE_FALLBACK_BASE_URLS;
const BASE_URL_CONFIG_URLS = PRODUCTION_CONFIG_URLS;

export let BASE_URL = FALLBACK_BASE_URLS[0] || '';
let baseUrlInitPromise = null;

const api = axios.create({
  baseURL: BASE_URL ? `${BASE_URL}/api` : undefined,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

const normalizeBaseUrl = (url) => {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
};

const toBaseUrlCandidate = (value) => {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return null;

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const hostOnly = normalized.replace(/^\/+|\/+$/g, '');
  if (!hostOnly) return null;

  if (hostOnly.includes(':')) {
    return `http://${hostOnly}`;
  }

  return `http://${hostOnly}:5000`;
};

const extractConfigBaseUrl = (data) => {
  if (!data || typeof data !== 'object') return null;

  const candidates = [
    data.link,
    data.base_url,
    data.baseUrl,
    data.url,
    data.ec2_url,
    data.ec2Url,
    data.ec2_ip,
    data.ec2Ip,
    data.ip,
  ];

  for (const candidate of candidates) {
    const baseUrl = toBaseUrlCandidate(candidate);
    if (baseUrl) return baseUrl;
  }

  return null;
};

const applyBaseUrl = (url) => {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) return false;
  BASE_URL = normalized;
  api.defaults.baseURL = `${BASE_URL}/api`;
  return true;
};

const persistBaseUrl = async (url) => {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) return;

  try {
    await AsyncStorage.setItem(BASE_URL_STORAGE_KEY, normalized);
  } catch (error) {
    // Ignore storage failures and continue with the in-memory URL.
  }
};

const isBaseUrlReachable = async (url) => {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${normalized}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

const fetchRemoteBaseUrl = async () => {
  for (const configUrl of BASE_URL_CONFIG_URLS) {
    try {
      const response = await fetch(`${configUrl}?ts=${Date.now()}`, {
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) continue;

      const data = await response.json();
      const candidate = extractConfigBaseUrl(data);

      if (candidate && (await isBaseUrlReachable(candidate))) {
        applyBaseUrl(candidate);
        await persistBaseUrl(candidate);
        return BASE_URL;
      }
    } catch (error) {
      // Keep trying the remaining config URLs.
    }
  }

  return null;
};

export const initializeBaseURL = async () => {
  if (baseUrlInitPromise) return baseUrlInitPromise;

  baseUrlInitPromise = (async () => {
    try {
      const cachedBaseUrl = await AsyncStorage.getItem(BASE_URL_STORAGE_KEY);
      if (cachedBaseUrl && (await isBaseUrlReachable(cachedBaseUrl))) {
        applyBaseUrl(cachedBaseUrl);
      }
    } catch (error) {
      // Ignore cache lookup failures and continue with remote discovery.
    }

    const remoteBaseUrl = await fetchRemoteBaseUrl();
    if (remoteBaseUrl) {
      return remoteBaseUrl;
    }

    for (const fallbackUrl of FALLBACK_BASE_URLS) {
      if (await isBaseUrlReachable(fallbackUrl)) {
        applyBaseUrl(fallbackUrl);
        await persistBaseUrl(fallbackUrl);
        return BASE_URL;
      }
    }

    if (FALLBACK_BASE_URLS[0]) {
      applyBaseUrl(FALLBACK_BASE_URLS[0]);
      await persistBaseUrl(FALLBACK_BASE_URLS[0]);
      return BASE_URL;
    }

    throw new Error('Unable to resolve API base URL. Configure a production base URL before release.');
  })();

  return baseUrlInitPromise;
};

export const refreshBaseURL = async () => {
  baseUrlInitPromise = null;
  return initializeBaseURL();
};

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  googleLogin: (idToken) => api.post('/auth/google', { idToken }),
  getLeaderboard: () => api.get('/auth/leaderboard'),
  updateProfile: (name) => api.put('/auth/profile', { name }),
  getMe: () => api.get('/auth/me'),
};

export const spotsAPI = {
  getSpots: (params) => api.get('/spots', { params }),
  getSpot: (id) => api.get(`/spots/${id}`),
  getCategories: () => api.get('/spots/categories'),
  getTrending: (params) => api.get('/spots/trending', { params }),
  getNearby: (lat, lon) => api.get('/spots/nearby', { params: { lat, lon, radius_km: 50 } }),
  getVisited: () => api.get('/spots/visited'),
  voteRemote: (id) => api.post(`/spots/${id}/vote-remote`),
  markVisited: (id, latitude, longitude) => api.post(`/spots/${id}/visit`, { latitude, longitude }),
  submitSpot: (data) => api.post('/spots', data),
  getPendingSpots: () => api.get('/spots/pending-spots'),
  voteApproveSpot: (id) => api.post(`/spots/${id}/vote-approval`),
};

export const photosAPI = {
  getPhotos: (spotId) => api.get(`/photos/${spotId}`),
  getPendingPhotos: (spotId) => api.get(`/photos/${spotId}/pending`),
  uploadPhotoWithLocation: (spotId, imageFile, latitude, longitude) => {
    const formData = new FormData();
    formData.append('photo', {
      uri: imageFile.uri,
      type: imageFile.type || 'image/jpeg',
      name: imageFile.fileName || 'photo.jpg',
    });
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    return api.post(`/photos/${spotId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  },
  approvePhoto: (photoId) => api.post(`/photos/${photoId}/approve`),
  flagPhoto: (photoId, reason) => api.post(`/photos/${photoId}/flag`, { reason }),
};

export const favoritesAPI = {
  getFavorites: () => api.get('/favorites'),
  addFavorite: (spotId) => api.post(`/favorites/${spotId}`),
  removeFavorite: (spotId) => api.delete(`/favorites/${spotId}`),
};

export const groupsAPI = {
  getGroups: () => api.get('/groups'),
  createGroup: (name) => api.post('/groups', { name }),
  joinGroup: (inviteCode) => api.post('/groups/join', { invite_code: inviteCode }),
  getGroup: (groupId) => api.get(`/groups/${groupId}`),
  suggestSpot: (groupId, spotId) => api.post(`/groups/${groupId}/suggestions`, { spot_id: spotId }),
  voteSuggestion: (groupId, suggestionId, vote) => api.post(`/groups/${groupId}/suggestions/${suggestionId}/vote`, { vote }),
};

export default api;
