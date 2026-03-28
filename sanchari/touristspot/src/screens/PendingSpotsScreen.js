import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { spotsAPI } from '../api';
import { useAuth } from '../utils/AuthContext';

export default function PendingSpotsScreen({ navigation }) {
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#e94560" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Spots</Text>
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
            tintColor="#e94560"
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
            <Text style={styles.spotLocation}>📍 {item.city}, {item.country}</Text>
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
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.voteBtnText}>👍 Approve this Spot</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#1a1a2e',
  },
  backBtn: { padding: 8 },
  backText: { color: '#fff', fontSize: 24 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryBadge: {
    backgroundColor: '#e94560', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  categoryText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  votes: { color: '#e94560', fontWeight: '700', fontSize: 14 },
  spotName: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  spotLocation: { fontSize: 13, color: '#aaa', marginBottom: 6 },
  description: { fontSize: 13, color: '#ccc', lineHeight: 20, marginBottom: 6 },
  address: { fontSize: 12, color: '#888', marginBottom: 6 },
  submittedBy: { fontSize: 12, color: '#666', marginBottom: 12 },
  progressBar: {
    height: 6, backgroundColor: '#333', borderRadius: 3, marginBottom: 12, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#e94560', borderRadius: 3 },
  voteBtn: {
    backgroundColor: '#e94560', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  voteBtnDisabled: { opacity: 0.6 },
  voteBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  votedBtn: {
    backgroundColor: '#1a3a1a', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#27ae60',
  },
  votedText: { color: '#27ae60', fontWeight: '600', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 52 },
  emptyText: { color: '#666', fontSize: 15, textAlign: 'center', lineHeight: 24 },
  submitBtn: {
    backgroundColor: '#e94560', borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 12, marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
