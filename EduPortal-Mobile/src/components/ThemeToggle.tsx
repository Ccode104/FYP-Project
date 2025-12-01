import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.toggle, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={toggleTheme}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>
        {isDark ? '☀️' : '🌙'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 20,
  },
});