import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../components/ui/AppHeader';
import { groupsAPI } from '../api';
import { colors, radius, shadow, spacing } from '../theme';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.22;

function normalizeSuggestion(item) {
  return {
    ...item,
    user_vote: item?.user_vote || (item?.user_yes ? 'yes' : item?.user_no ? 'no' : null),
  };
}

export default function GroupPlannerScreen({ navigation, route }) {
  const { groupId, groupName } = route.params;
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const pan = useRef(new Animated.ValueXY()).current;

  const loadGroup = useCallback(async () => {
    try {
      setLoading(true);
      const response = await groupsAPI.getGroup(groupId);
      setGroup(response.data?.group || null);
      setMembers(response.data?.members || []);
      setSuggestions((response.data?.suggestions || []).map(normalizeSuggestion));
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load group');
    } finally {
      setLoading(false);
      pan.setValue({ x: 0, y: 0 });
    }
  }, [groupId, pan]);

  useFocusEffect(
    useCallback(() => {
      loadGroup();
    }, [loadGroup])
  );

  const pendingSuggestions = useMemo(
    () => suggestions.filter(item => !item.user_vote),
    [suggestions]
  );
  const reviewedSuggestions = useMemo(
    () => suggestions.filter(item => item.user_vote),
    [suggestions]
  );
  const currentSuggestion = pendingSuggestions[0];
  const remainingSuggestions = useMemo(() => pendingSuggestions.slice(1), [pendingSuggestions]);

  const voteAndAdvance = useCallback(async (vote) => {
    if (!currentSuggestion) return;
    try {
      await groupsAPI.voteSuggestion(groupId, currentSuggestion.id, vote);
      setSuggestions(prev => prev.map(item => {
        if (item.id !== currentSuggestion.id) return item;
        return {
          ...item,
          user_vote: vote,
          yes_votes: (item.yes_votes || 0) + (vote === 'yes' ? 1 : 0),
          no_votes: (item.no_votes || 0) + (vote === 'no' ? 1 : 0),
        };
      }));
      pan.setValue({ x: 0, y: 0 });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to record vote');
    }
  }, [currentSuggestion, groupId, pan]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        Animated.timing(pan, {
          toValue: { x: width, y: gesture.dy },
          duration: 180,
          useNativeDriver: false,
        }).start(() => voteAndAdvance('yes'));
        return;
      }

      if (gesture.dx < -SWIPE_THRESHOLD) {
        Animated.timing(pan, {
          toValue: { x: -width, y: gesture.dy },
          duration: 180,
          useNativeDriver: false,
        }).start(() => voteAndAdvance('no'));
        return;
      }

      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        friction: 5,
      }).start();
    },
  }), [pan, voteAndAdvance]);

  const rotate = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  return (
    <View style={styles.container}>
      <AppHeader
        title={group?.name || groupName || 'Trip Planner'}
        subtitle={`Invite code ${group?.invite_code || ''}`}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.headerMeta}>
        <Text style={styles.metaText}>{members.length} people planning together</Text>
        <Pressable style={styles.shareButton} onPress={() => navigation.navigate('Groups')}>
          <Text style={styles.shareButtonText}>Manage Groups</Text>
        </Pressable>
      </View>

      <View style={styles.memberRow}>
        {members.slice(0, 6).map((member) => (
          <View key={member.id} style={styles.memberChip}>
            <Text style={styles.memberChipText}>{member?.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.deckArea}>
          {remainingSuggestions.slice(0, 2).reverse().map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.card,
                styles.cardStack,
                { transform: [{ scale: 0.94 + index * 0.03 }, { translateY: 10 + index * 8 }] },
              ]}
            >
              <Text style={styles.stackHint}>{item.name}</Text>
            </View>
          ))}

          {currentSuggestion ? (
            <Animated.View
              style={[
                styles.card,
                {
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { rotate },
                  ],
                },
              ]}
              {...panResponder.panHandlers}
            >
              <View style={styles.voteHintRow}>
                <Text style={[styles.voteHint, styles.voteYes]}>RIGHT = GO</Text>
                <Text style={[styles.voteHint, styles.voteNo]}>LEFT = SKIP</Text>
              </View>

              <Text style={styles.cardTitle}>{currentSuggestion.name}</Text>
              <Text style={styles.cardMeta}>
                {currentSuggestion.city}, {currentSuggestion.country} • {currentSuggestion.category}
              </Text>
              <Text style={styles.cardDescription} numberOfLines={4}>
                {currentSuggestion.description || 'No description available.'}
              </Text>

              <View style={styles.voteStats}>
                <View style={styles.votePill}>
                  <MaterialCommunityIcons name="thumb-up-outline" size={16} color={colors.success} />
                  <Text style={styles.votePillText}>{currentSuggestion.yes_votes || 0}</Text>
                </View>
                <View style={[styles.votePill, styles.votePillNo]}>
                  <MaterialCommunityIcons name="thumb-down-outline" size={16} color={colors.danger} />
                  <Text style={styles.votePillText}>{currentSuggestion.no_votes || 0}</Text>
                </View>
              </View>

              <Text style={styles.suggestedBy}>Suggested by {currentSuggestion.suggested_by_name || 'Friend'}</Text>

              <View style={styles.actionRow}>
                <Pressable style={[styles.actionButton, styles.noButton]} onPress={() => voteAndAdvance('no')}>
                  <Text style={styles.actionButtonText}>Skip</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.detailsButton]}
                  onPress={() => navigation.navigate('SpotDetail', { spotId: currentSuggestion.spot_id, spotName: currentSuggestion.name })}
                >
                  <Text style={styles.detailsButtonText}>Open Spot</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.yesButton]} onPress={() => voteAndAdvance('yes')}>
                  <Text style={styles.actionButtonText}>Go</Text>
                </Pressable>
              </View>
            </Animated.View>
          ) : (
            <View style={[styles.card, styles.emptyCard]}>
              <Text style={styles.cardTitle}>No pending suggestions</Text>
              <Text style={styles.cardDescription}>
                Ask your friends to open a spot and share it into this group. Reviewed spots stay listed below.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.reviewedSection}>
          <Text style={styles.reviewedTitle}>Reviewed Spots</Text>
          {reviewedSuggestions.length > 0 ? reviewedSuggestions.map(item => (
            <Pressable
              key={item.id}
              style={styles.reviewedCard}
              onPress={() => navigation.navigate('SpotDetail', { spotId: item.spot_id, spotName: item.name })}
            >
              <View style={styles.reviewedInfo}>
                <Text style={styles.reviewedName}>{item.name}</Text>
                <Text style={styles.reviewedMeta}>
                  {item.city}, {item.country} • {item.category}
                </Text>
              </View>
              <View style={[styles.reviewBadge, item.user_vote === 'yes' ? styles.reviewBadgeYes : styles.reviewBadgeNo]}>
                <MaterialCommunityIcons
                  name={item.user_vote === 'yes' ? 'thumb-up' : 'thumb-down'}
                  size={14}
                  color={colors.white}
                />
                <Text style={styles.reviewBadgeText}>{item.user_vote === 'yes' ? 'Go' : 'Skip'}</Text>
              </View>
            </Pressable>
          )) : (
            <Text style={styles.reviewedEmpty}>Swipe suggestions left or right and they will appear here.</Text>
          )}
        </View>
      </ScrollView>

      {!loading && !!group && (
        <Text style={styles.footerHint}>
          Swipe right to keep a place in the trip plan, swipe left to rule it out.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 120 },
  headerMeta: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: { color: colors.textSecondary, fontSize: 13 },
  shareButton: {
    borderRadius: radius.round,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shareButtonText: { color: colors.textPrimary, fontWeight: '700', fontSize: 12 },
  memberRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  memberChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  memberChipText: { color: colors.white, fontWeight: '800' },
  deckArea: {
    minHeight: 520,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    justifyContent: 'center',
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    minHeight: 420,
    ...shadow,
  },
  cardStack: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
  stackHint: { color: colors.textMuted, fontWeight: '700' },
  voteHintRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  voteHint: { fontSize: 12, fontWeight: '800' },
  voteYes: { color: colors.success },
  voteNo: { color: colors.danger },
  cardTitle: { color: colors.textPrimary, fontSize: 28, fontWeight: '800' },
  cardMeta: { color: colors.primary, marginTop: 8, fontSize: 14, fontWeight: '700' },
  cardDescription: { color: colors.textSecondary, marginTop: spacing.md, fontSize: 15, lineHeight: 23 },
  voteStats: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  votePill: {
    borderRadius: radius.round,
    backgroundColor: 'rgba(39,174,96,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  votePillNo: { backgroundColor: 'rgba(233,69,96,0.15)' },
  votePillText: { color: colors.textPrimary, fontWeight: '800' },
  suggestedBy: { color: colors.textMuted, marginTop: spacing.lg, fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 'auto' },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noButton: { backgroundColor: colors.danger },
  yesButton: { backgroundColor: colors.success },
  detailsButton: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  actionButtonText: { color: colors.white, fontWeight: '800' },
  detailsButtonText: { color: colors.textPrimary, fontWeight: '800' },
  emptyCard: { justifyContent: 'center' },
  reviewedSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  reviewedTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm },
  reviewedCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewedInfo: { flex: 1, paddingRight: spacing.md },
  reviewedName: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  reviewedMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  reviewBadge: {
    borderRadius: radius.round,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewBadgeYes: { backgroundColor: colors.success },
  reviewBadgeNo: { backgroundColor: colors.danger },
  reviewBadgeText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  reviewedEmpty: { color: colors.textMuted, fontSize: 13 },
  footerHint: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
  },
});
