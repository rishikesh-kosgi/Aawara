import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, PermissionsAndroid, AppState } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authAPI, spotsAPI, initializeBaseURL } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const PENDING_SPOTS_SEEN_KEY = 'pending_spots_seen_count';
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationGranted, setLocationGranted] = useState(false);
  const [pendingSpotsCount, setPendingSpotsCount] = useState(0);

  useEffect(() => {
    requestLocationPermission();
    (async () => {
      try {
        await initializeBaseURL();
        await loadUser();
      } catch (error) {
        console.warn('Base URL initialization failed:', error);
        Alert.alert(
          'Server configuration needed',
          'The app could not find a reachable backend. Update the production API URL before using the release build.'
        );
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestLocationPermission() {
    try {
      if (Platform.OS !== 'android') {
        setLocationGranted(true);
        return;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '📍 Location Access Required',
          message:
            'TouristSpot needs your location to:\n\n' +
            '• Show nearby tourist spots\n' +
            '• Verify you are at the spot before uploading photos\n' +
            '• Show trending spots in your area\n\n' +
            'Location access is mandatory to use this app.',
          buttonPositive: 'Allow Location',
          buttonNegative: 'Deny',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setLocationGranted(true);
      } else {
        setLocationGranted(false);
        Alert.alert(
          '⚠️ Location Required',
          'TouristSpot requires location access to work. Please enable location permission in your phone settings.\n\nSettings → Apps → TouristSpot → Permissions → Location → Allow',
          [
            {
              text: 'OK, I understand',
              onPress: () => requestLocationPermission(),
            },
          ]
        );
      }
    } catch (err) {
      console.warn('Location permission error:', err);
    }
  }

  async function loadUser() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const res = await authAPI.getMe();
        setUser(res.data.user);
        setIsLoggedIn(true);
        refreshPendingSpots(false);
      }
    } catch (e) {
      await AsyncStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }

  async function login(userData, token) {
    await AsyncStorage.setItem('auth_token', token);
    setUser(userData);
    setIsLoggedIn(true);
    refreshPendingSpots(false);
    refreshUser(false);
  }

  async function logout() {
    await AsyncStorage.removeItem('auth_token');
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      // Ignore Google logout failures.
    }
    setUser(null);
    setIsLoggedIn(false);
    setPendingSpotsCount(0);
  }

  async function updateUser(updatedUser) {
    setUser(prev => ({ ...(prev || {}), ...(updatedUser || {}) }));
  }

  async function refreshUser(showError = false) {
    try {
      const res = await authAPI.getMe();
      setUser(res.data.user);
    } catch (e) {
      if (showError) {
        Alert.alert('Session error', 'Please login again.');
      }
    }
  }

  async function markPendingSpotsSeen() {
    await AsyncStorage.setItem(PENDING_SPOTS_SEEN_KEY, String(pendingSpotsCount));
  }

  async function refreshPendingSpots(showAlert = true) {
    try {
      const res = await spotsAPI.getPendingSpots();
      const count = Array.isArray(res.data?.spots) ? res.data.spots.length : 0;
      setPendingSpotsCount(count);

      const seenRaw = await AsyncStorage.getItem(PENDING_SPOTS_SEEN_KEY);
      const seenCount = Number.isFinite(Number(seenRaw)) ? Number(seenRaw) : 0;
      if (showAlert && count > seenCount) {
        const delta = count - seenCount;
        Alert.alert(
          'New spots need review',
          `${delta} new submitted spot${delta > 1 ? 's are' : ' is'} waiting for approval. Open Profile to review.`
        );
      }
    } catch (e) {
      // Notification check is best effort only.
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return;

    refreshPendingSpots(false);

    const intervalId = setInterval(() => {
      refreshPendingSpots(true);
      refreshUser(false);
    }, 60000);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshPendingSpots(true);
        refreshUser(false);
      }
    });

    return () => {
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [isLoggedIn]);

  return (
    <AuthContext.Provider value={{
      user, isLoggedIn, loading, locationGranted, pendingSpotsCount,
      login, logout, updateUser, requestLocationPermission,
      refreshPendingSpots, markPendingSpotsSeen, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
