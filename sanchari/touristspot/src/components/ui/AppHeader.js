import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, typography } from '../../theme';
import { useAppTheme } from '../../theme/ThemeProvider';

export default function AppHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  rightLabel,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.leftWrap}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textPrimary} />
          </Pressable>
        ) : null}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightIcon ? (
        <Pressable onPress={onRightPress} style={styles.iconBtn} hitSlop={8}>
          <MaterialCommunityIcons name={rightIcon} size={20} color={colors.textPrimary} />
        </Pressable>
      ) : null}
      {!rightIcon && rightLabel ? <Text style={styles.rightLabel}>{rightLabel}</Text> : null}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  container: {
    paddingTop: 48,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.hero,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.label,
    marginTop: 4,
  },
  rightLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});
