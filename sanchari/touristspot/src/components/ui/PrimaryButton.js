import React, { useMemo } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { radius, shadow } from '../../theme';
import { useAppTheme } from '../../theme/ThemeProvider';

export default function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      style={[styles.button, (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={[styles.text, textStyle]}>{icon ? `${icon} ${label}` : label}</Text>}
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...shadow,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '700',
  },
});
