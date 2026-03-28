import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { authAPI } from '../api';
import AppHeader from '../components/ui/AppHeader';
import { radius, shadow, spacing } from '../theme';
import { useAppTheme } from '../theme/ThemeProvider';

function getMedal(index) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `#${index + 1}`;
}

export default function LeaderboardScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    try {
      const response = await authAPI.getLeaderboard();
      setUsers(response.data?.users || []);
    } catch (error) {
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLeaderboard();
    }, [loadLeaderboard])
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Top Aawaras" subtitle="Users leading the travel board" />

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLeaderboard(); }} />
        }
        ListHeaderComponent={
          <View style={styles.heroCard}>
            <Text style={styles.kicker}>Leaderboard</Text>
            <MaterialCommunityIcons name="trophy-award" size={34} color={colors.card} />
            <Text style={styles.heroTitle}>Travel legends of Aawara</Text>
            <Text style={styles.heroSub}>
              Points come from unique spots visited plus unique spots where a user uploaded a photo.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <View style={styles.rankWrap}>
              <Text style={styles.rankText}>{getMedal(index)}</Text>
            </View>

            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{item?.name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
            )}

            <View style={styles.userBlock}>
              <Text style={styles.name}>{item.name || item.email || 'Traveller'}</Text>
              <Text style={styles.meta}>
                {item.unique_spots_visited || 0} visits • {item.unique_spot_uploads || 0} uploads
              </Text>
            </View>

            <View style={styles.pointsWrap}>
              <Text style={styles.points}>{item.points || 0}</Text>
              <Text style={styles.pointsLabel}>pts</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="trophy-broken" size={34} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No scores yet</Text>
              <Text style={styles.emptySub}>Visit places and upload real spot photos to appear here.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadow,
  },
  kicker: { color: colors.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginTop: 10, letterSpacing: -0.6 },
  heroSub: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 8 },
  row: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow,
  },
  rankWrap: {
    width: 46,
    alignItems: 'center',
  },
  rankText: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  avatarText: { color: colors.textDark, fontSize: 22, fontWeight: '800' },
  userBlock: { flex: 1 },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  pointsWrap: { minWidth: 54, alignItems: 'center' },
  points: { color: colors.card, fontSize: 22, fontWeight: '800' },
  pointsLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 72, paddingHorizontal: 24 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptySub: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6 },
});
