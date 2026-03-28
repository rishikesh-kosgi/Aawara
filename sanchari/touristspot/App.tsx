import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { AuthProvider, useAuth } from './src/utils/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import SetNameScreen from './src/screens/SetNameScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import SpotDetailScreen from './src/screens/SpotDetailScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import GroupPlannerScreen from './src/screens/GroupPlannerScreen';
import SubmitSpotScreen from './src/screens/SubmitSpotScreen';
import PendingSpotsScreen from './src/screens/PendingSpotsScreen';
import LoadingVideoScreen from './src/components/LoadingVideoScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

function extractInviteCode(url) {
  if (!url) return null;

  const match =
    String(url).match(/^touristspot:\/\/groups\/join\/([A-Z0-9_-]+)$/i) ||
    String(url).match(/[?&]inviteCode=([A-Z0-9_-]+)/i);

  return match?.[1] ? match[1].toUpperCase() : null;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0d0d1a',
          borderTopColor: '#1e1e2e',
          paddingBottom: 18,
          paddingTop: 10,
          height: 84,
        },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Explore"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="compass-outline" size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="map-outline" size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Saved"
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Saved',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="bookmark-outline" size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Aawaras"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Aawaras',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="trophy-outline" size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AppShell() {
  const { isLoggedIn, loading } = useAuth();
  const [showLoadingVideo, setShowLoadingVideo] = useState(true);
  const [pendingInviteCode, setPendingInviteCode] = useState(null);
  const [navigationReady, setNavigationReady] = useState(false);

  useEffect(() => {
    let active = true;

    Linking.getInitialURL().then(url => {
      if (!active) return;
      const inviteCode = extractInviteCode(url);
      if (inviteCode) setPendingInviteCode(inviteCode);
    }).catch(() => {});

    const subscription = Linking.addEventListener('url', ({ url }) => {
      const inviteCode = extractInviteCode(url);
      if (inviteCode) setPendingInviteCode(inviteCode);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !pendingInviteCode || !navigationReady || !navigationRef.isReady()) return;

    navigationRef.navigate('Groups', { inviteCode: pendingInviteCode });
    setPendingInviteCode(null);
  }, [isLoggedIn, navigationReady, pendingInviteCode]);

  if (showLoadingVideo) {
    return <LoadingVideoScreen onFinish={() => setShowLoadingVideo(false)} />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setNavigationReady(true)}
    >
      {isLoggedIn ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="SpotDetail" component={SpotDetailScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Groups" component={GroupsScreen} />
          <Stack.Screen name="GroupPlanner" component={GroupPlannerScreen} />
          <Stack.Screen name="SubmitSpot" component={SubmitSpotScreen} />
          <Stack.Screen name="PendingSpots" component={PendingSpotsScreen} />
          <Stack.Screen name="SetName" component={SetNameScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0d1a',
  },
});
