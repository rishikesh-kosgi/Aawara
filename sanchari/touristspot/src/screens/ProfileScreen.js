import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { authAPI } from '../api';
import AppHeader from '../components/ui/AppHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Pill from '../components/ui/Pill';
import { colors, radius, shadow, spacing } from '../theme';

export default function ProfileScreen({ navigation }) {
  const {
    user,
    logout,
    updateUser,
    isLoggedIn,
    pendingSpotsCount,
    markPendingSpotsSeen,
    refreshPendingSpots,
  } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  async function saveName() {
    if (name.trim().length < 2) return Alert.alert('Invalid', 'Name must be at least 2 characters.');
    setSaving(true);
    try {
      await authAPI.updateProfile(name.trim());
      await updateUser({ name: name.trim() });
      setEditing(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update name');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <AppHeader title="Profile" subtitle="Manage account settings" />
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.bigEmoji}>🔐</Text>
          </View>
          <Text style={styles.emptyTitle}>Log in to access your profile</Text>
          <Text style={styles.emptySub}>Track points, manage account, and save favorites.</Text>
          <PrimaryButton label="Log In / Sign Up" onPress={() => navigation.navigate('Login')} style={styles.emptyButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Profile" subtitle="Account and preferences" />
      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name ? user.name[0].toUpperCase() : '?'}</Text>
          </View>
          <View style={styles.nameRow}>
            {editing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <Pressable style={styles.iconAction} onPress={saveName} disabled={saving}>
                  <Text style={styles.iconEmoji}>✓</Text>
                </Pressable>
                <Pressable
                  style={[styles.iconAction, styles.cancelAction]}
                  onPress={() => {
                    setEditing(false);
                    setName(user?.name || '');
                  }}
                >
                  <Text style={[styles.iconEmoji, styles.cancelEmoji]}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.inlineName} onPress={() => setEditing(true)}>
                <Text style={styles.userName}>{user?.name || 'Set your name'}</Text>
                <Text style={styles.smallEmoji}>✏️</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.userPhone}>{user?.email || user?.phone}</Text>
          <Pill label={`${user?.points || 0} points`} tone="primary" />
        </View>

        <View style={styles.menuCard}>
          <Pressable style={styles.menuItem} onPress={() => navigation.navigate('Groups')}>
            <View style={[styles.menuIconWrap, styles.reviewIconWrap]}>
              <Text style={styles.smallEmoji}>👥</Text>
            </View>
            <Text style={styles.menuText}>Trip Groups</Text>
            <Text style={styles.smallEmoji}>›</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => navigation.navigate('Saved')}>
            <View style={styles.menuIconWrap}>
              <Text style={styles.smallEmoji}>❤️</Text>
            </View>
            <Text style={styles.menuText}>My Favorites</Text>
            <Text style={styles.smallEmoji}>›</Text>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={async () => {
              await markPendingSpotsSeen();
              await refreshPendingSpots(false);
              navigation.navigate('PendingSpots');
            }}
          >
            <View style={[styles.menuIconWrap, styles.reviewIconWrap]}>
              <Text style={styles.smallEmoji}>📝</Text>
            </View>
            <Text style={styles.menuText}>Review New Spots</Text>
            {pendingSpotsCount > 0 ? (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{pendingSpotsCount}</Text>
              </View>
            ) : null}
            <Text style={styles.smallEmoji}>›</Text>
          </Pressable>
        </View>

        <PrimaryButton label="Log Out" onPress={handleLogout} style={styles.logoutBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: spacing.md, color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  bigEmoji: { fontSize: 38 },
  emptySub: { marginTop: 6, color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  emptyButton: { width: '100%', marginTop: spacing.xl },
  profileCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    padding: spacing.xl,
    gap: 8,
    ...shadow,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 36, fontWeight: '800' },
  nameRow: { width: '100%', alignItems: 'center', marginTop: spacing.sm },
  inlineName: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  userPhone: { color: colors.textSecondary, fontSize: 13 },
  editRow: { width: '100%', flexDirection: 'row', gap: 8, alignItems: 'center' },
  nameInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
  },
  iconAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  iconEmoji: { color: colors.white, fontSize: 16, fontWeight: '800' },
  cancelEmoji: { color: colors.textSecondary },
  smallEmoji: { fontSize: 16, color: colors.textMuted },
  cancelAction: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  menuCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  menuItem: {
    minHeight: 60,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewIconWrap: { backgroundColor: '#CCFBF1' },
  menuText: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  badgeCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  badgeCountText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  logoutBtn: { backgroundColor: colors.danger, marginTop: spacing.sm },
});
