import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';

export default function Pill({ label, tone = 'default' }) {
  return (
    <View style={[styles.base, styles[tone] || styles.default]}>
      <Text style={[styles.text, styles[`${tone}Text`] || styles.defaultText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  primary: { backgroundColor: 'rgba(233, 69, 96, 0.10)', borderColor: colors.primary },
  primaryText: { color: colors.primary },
  success: { backgroundColor: 'rgba(39, 174, 96, 0.12)', borderColor: colors.success },
  successText: { color: colors.success },
  warning: { backgroundColor: 'rgba(243, 156, 18, 0.12)', borderColor: colors.warning },
  warningText: { color: colors.warning },
  danger: { backgroundColor: 'rgba(233, 69, 96, 0.10)', borderColor: colors.danger },
  dangerText: { color: colors.danger },
});
