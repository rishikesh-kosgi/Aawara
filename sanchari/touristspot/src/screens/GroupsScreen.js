import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../components/ui/AppHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import { groupsAPI } from '../api';
import { colors, radius, shadow, spacing } from '../theme';

export default function GroupsScreen({ navigation, route }) {
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const handledInviteRef = useRef(null);

  const loadGroups = useCallback(async () => {
    try {
      const response = await groupsAPI.getGroups();
      setGroups(response.data?.groups || []);
    } catch (error) {
      setGroups([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  async function handleCreateGroup() {
    if (groupName.trim().length < 3) {
      return Alert.alert('Invalid group', 'Group name must be at least 3 characters.');
    }
    setLoading(true);
    try {
      const response = await groupsAPI.createGroup(groupName.trim());
      setGroupName('');
      await loadGroups();
      navigation.navigate('GroupPlanner', {
        groupId: response.data.group.id,
        groupName: response.data.group.name,
      });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  }

  const handleJoinGroup = useCallback(async (overrideCode) => {
    const code = String(overrideCode || inviteCode || '').trim().toUpperCase();
    if (!code) {
      return Alert.alert('Invite code', 'Enter the group invite code.');
    }
    setLoading(true);
    try {
      const response = await groupsAPI.joinGroup(code);
      setInviteCode('');
      await loadGroups();
      navigation.navigate('GroupPlanner', {
        groupId: response.data.group.id,
        groupName: response.data.group.name,
      });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  }, [inviteCode, loadGroups, navigation]);

  useEffect(() => {
    const linkedInviteCode = String(route?.params?.inviteCode || '').trim().toUpperCase();
    if (!linkedInviteCode || handledInviteRef.current === linkedInviteCode) return;

    handledInviteRef.current = linkedInviteCode;
    setInviteCode(linkedInviteCode);
    handleJoinGroup(linkedInviteCode);
  }, [handleJoinGroup, route?.params?.inviteCode]);

  async function handleShareGroup(group) {
    const deepLink = `touristspot://groups/join/${group.invite_code}`;
    const message =
      `Join "${group.name}" in TouristSpot.\n` +
      `Open this link in the app: ${deepLink}\n` +
      `Invite code: ${group.invite_code}`;

    try {
      await Share.share({
        title: `Join ${group.name}`,
        message,
        url: deepLink,
      });
    } catch (error) {
      Alert.alert('Share failed', 'Could not open the share sheet right now.');
    }
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Trip Groups" subtitle="Plan with your friends inside the app" onBack={() => navigation.goBack()} />

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <View style={styles.headerStack}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create a planning group</Text>
              <TextInput
                style={styles.input}
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Weekend Goa Squad"
                placeholderTextColor={colors.textMuted}
              />
              <PrimaryButton label="Create Group" onPress={handleCreateGroup} loading={loading} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Join with invite code</Text>
              <TextInput
                style={styles.input}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                placeholder="AB12CD"
                placeholderTextColor={colors.textMuted}
              />
              <PrimaryButton label="Join Group" onPress={() => handleJoinGroup()} loading={loading} />
            </View>

            <Text style={styles.sectionTitle}>Your groups</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={styles.groupCard}
            onPress={() => navigation.navigate('GroupPlanner', { groupId: item.id, groupName: item.name })}
          >
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupMeta}>
                Code {item.invite_code} • {item.member_count} members • {item.suggestion_count} spots
              </Text>
              <Pressable
                style={styles.shareLinkBtn}
                onPress={(event) => {
                  event.stopPropagation();
                  handleShareGroup(item);
                }}
              >
                <Text style={styles.shareLinkBtnText}>Share join link</Text>
              </Pressable>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.accepted_count || 0} yes</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No groups yet. Create one and start swiping destinations.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  headerStack: { gap: spacing.md, marginBottom: spacing.md },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  cardTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  groupCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow,
  },
  groupInfo: { flex: 1 },
  groupName: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  groupMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
  shareLinkBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.round,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareLinkBtnText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  badge: {
    minWidth: 64,
    borderRadius: radius.round,
    backgroundColor: 'rgba(39,174,96,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  badgeText: { color: colors.success, fontWeight: '800', fontSize: 12 },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
