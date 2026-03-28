import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radius } from '../../theme';
import { useAppTheme } from '../../theme/ThemeProvider';

export default function Pill({ label, tone = 'default' }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.base, styles[tone] || styles.default]}>
      <Text style={[styles.text, styles[`${tone}Text`] || styles.defaultText]}>{label}</Text>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.round,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  default: { backgroundColor: colors.surface, borderColor: colors.border },
  defaultText: { color: colors.textSecondary },
  primary: { backgroundColor: 'rgba(200, 111, 76, 0.16)', borderColor: colors.primary },
  primaryText: { color: colors.card },
  success: { backgroundColor: 'rgba(127, 176, 105, 0.16)', borderColor: colors.success },
  successText: { color: colors.success },
  warning: { backgroundColor: 'rgba(217, 164, 91, 0.16)', borderColor: colors.warning },
  warningText: { color: colors.warning },
  danger: { backgroundColor: 'rgba(212, 106, 90, 0.16)', borderColor: colors.danger },
  dangerText: { color: colors.danger },
});
