import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, PanResponder } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = 280;

interface TabItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

interface SidebarNavProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function SidebarNav({
  tabs,
  activeTab,
  onTabChange,
  isOpen,
  onToggle
}: SidebarNavProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const slideAnim = useRef(new Animated.Value(isOpen ? 0 : -SIDEBAR_WIDTH)).current;

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -SIDEBAR_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50 && isOpen) {
          onToggle();
        }
      },
    })
  ).current;

  const handleTabPress = (tabId: string) => {
    onTabChange(tabId);
    onToggle(); // Close sidebar on mobile after selection
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onToggle}
        />
      )}

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            backgroundColor: theme.surface,
            borderRightColor: theme.border,
            transform: [{ translateX: slideAnim }],
          }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.navList}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.navItem,
                activeTab === tab.id && { backgroundColor: theme.primary }
              ]}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.navIcon,
                activeTab === tab.id ? { color: theme.bg } : { color: theme['text-secondary'] }
              ]}>
                {tab.icon}
              </Text>
              <Text style={[
                styles.navLabel,
                activeTab === tab.id ? { color: theme.bg } : { color: theme.text }
              ]}>
                {tab.label}
              </Text>
              {tab.badge && tab.badge > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.badgeText, { color: theme.bg }]}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 98,
  },
  sidebar: {
    position: 'absolute',
    top: 120, // Below hamburger button with spacing
    left: 0,
    width: SIDEBAR_WIDTH,
    bottom: 0, // Extend to bottom
    borderRightWidth: 1,
    borderTopRightRadius: 16, // Rounded top-right corner
    borderBottomRightRadius: 16, // Rounded bottom-right corner
    zIndex: 99,
    paddingTop: 16, // Add some top padding for navigation items
    paddingHorizontal: 12,
  },
  navList: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 4,
    position: 'relative',
  },
  navIcon: {
    fontSize: 20,
    width: 24,
    textAlign: 'center',
    marginRight: 12,
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});