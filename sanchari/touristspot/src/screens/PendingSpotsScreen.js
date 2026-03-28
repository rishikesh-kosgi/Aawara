import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { spotsAPI } from '../api';
import { useAuth } from '../utils/AuthContext';
import { shadow } from '../theme';
import { useAppTheme } from '../theme/ThemeProvider';

export default function PendingSpotsScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isLoggedIn, markPendingSpotsSeen, refreshPendingSpots } = useAuth();
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voting, setVoting] = useState(null);

  useEffect(() => { loadPendingSpots(); }, []);

  useFocusEffect(
    React.useCallback(() => {
      markPendingSpotsSeen();
      refreshPendingSpots(false);
    }, [markPendingSpotsSeen, refreshPendingSpots])
  );

  async function loadPendingSpots() {
    try {
      const res = await spotsAPI.getPendingSpots();
      setSpots(res.data.spots);
    } catch (e) {
      console.error('Load pending spots error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function voteApprove(spotId) {
    if (!isLoggedIn) return navigation.navigate('Login');
    setVoting(spotId);
    try {
      const res = await spotsAPI.voteApproveSpot(spotId);
      Alert.alert('✅ Vote Recorded', res.data.message);
      loadPendingSpots();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Vote failed');
    } finally {
      setVoting(null);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.card} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKicker}>Community Queue</Text>
          <Text style={styles.headerTitle}>Pending Spots</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={spots}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadPendingSpots(); }}
            tintColor={colors.card}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
              <Text style={styles.votes}>{item.vote_count}/5 votes</Text>
            </View>

            <Text style={styles.spotName}>{item.name}</Text>
              <Text style={styles.spotLocation}>{item.city}, {item.country}</Text>
            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            ) : null}
            {item.address ? (
              <Text style={styles.address}>🗺️ {item.address}</Text>
            ) : null}
            <Text style={styles.submittedBy}>
              Submitted by: {item.submitted_by_name || 'Anonymous'}
            </Text>

            {/* Vote progress bar */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(item.vote_count / 5) * 100}%` }]} />
            </View>

            {item.has_voted ? (
              <View style={styles.votedBtn}>
                <Text style={styles.votedText}>✅ You already voted for this spot</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.voteBtn, voting === item.id && styles.voteBtnDisabled]}
                onPress={() => voteApprove(item.id)}
                disabled={voting === item.id}
              >
                {voting === item.id
                  ? <ActivityIndicator color={colors.textDark} size="small" />
                  : <Text style={styles.voteBtnText}>👍 Approve this Spot</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>A</Text>
            <Text style={styles.emptyText}>No pending spots right now.{'\n'}Be the first to submit one!</Text>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => navigation.navigate('SubmitSpot')}
            >
              <Text style={styles.submitBtnText}>+ Submit a Spot</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: colors.background,
  },
  backBtn: { padding: 8 },
  backText: { color: colors.textPrimary, fontSize: 24 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerKicker: { color: colors.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginTop: 4, letterSpacing: -0.7 },
  list: { padding: 16, gap: 12, paddingBottom: 120 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.border, ...shadow },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryBadge: {
    backgroundColor: colors.card, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  categoryText: { color: colors.textDark, fontSize: 11, fontWeight: '800' },
  votes: { color: colors.card, fontWeight: '700', fontSize: 14 },
  spotName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 4, letterSpacing: -0.5 },
  spotLocation: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  description: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 6 },
  address: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  submittedBy: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
  progressBar: {
    height: 6, backgroundColor: colors.border, borderRadius: 3, marginBottom: 12, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.card, borderRadius: 3 },
  voteBtn: {
    backgroundColor: colors.card, borderRadius: 16,
    paddingVertical: 12, alignItems: 'center',
  },
  voteBtnDisabled: { opacity: 0.6 },
  voteBtnText: { color: colors.textDark, fontWeight: '800', fontSize: 15 },
  votedBtn: {
    backgroundColor: 'rgba(127,176,105,0.12)', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.success,
  },
  votedText: { color: colors.success, fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: {
    fontSize: 34,
    color: colors.textDark,
    width: 72,
    height: 72,
    borderRadius: 36,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  emptyText: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 24 },
  submitBtn: {
    backgroundColor: colors.card, borderRadius: 16,
    paddingHorizontal: 28, paddingVertical: 12, marginTop: 8,
  },
  submitBtnText: { color: colors.textDark, fontWeight: '800', fontSize: 15 },
});
