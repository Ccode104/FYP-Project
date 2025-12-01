export const lightTheme = {
  // Backgrounds
  bg: '#ffffff',
  'bg-secondary': '#f8f9fa',
  surface: '#ffffff',
  'surface-elevated': '#ffffff',

  // Text
  text: '#1f2937',
  'text-secondary': '#6b7280',
  muted: '#9ca3af',

  // Primary
  primary: '#3b82f6',
  'primary-light': '#dbeafe',
  'primary-hover': '#2563eb',

  // Secondary
  secondary: '#6b7280',

  // Borders
  border: '#e5e7eb',
  'border-strong': '#d1d5db',
  'border-hover': '#d1d5db',

  // Accent colors for course cards
  accent: {
    blue: '#3b82f6',
    green: '#10b981',
    purple: '#8b5cf6',
    orange: '#f59e0b',
    pink: '#ec4899',
    cyan: '#06b6d4',
  },

  // Status
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',

  // Ring focus
  ring: '#3b82f6',

  // Shadows
  shadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  'shadow-lg': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  'shadow-xl': '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',

  // Radius
  'radius-sm': 6,
  'radius-md': 8,
  'radius-lg': 12,
  'radius-xl': 16,

  // Font
  'font-sans': 'System',
};

export const darkTheme = {
  // Backgrounds
  bg: '#111827',
  'bg-secondary': '#1f2937',
  surface: '#1f2937',
  'surface-elevated': '#374151',

  // Text
  text: '#f9fafb',
  'text-secondary': '#d1d5db',
  muted: '#9ca3af',

  // Primary
  primary: '#3b82f6',
  'primary-light': '#1e3a8a',
  'primary-hover': '#60a5fa',

  // Secondary
  secondary: '#6b7280',

  // Borders
  border: '#374151',
  'border-strong': '#4b5563',
  'border-hover': '#4b5563',

  // Accent colors
  accent: {
    blue: '#3b82f6',
    green: '#10b981',
    purple: '#8b5cf6',
    orange: '#f59e0b',
    pink: '#ec4899',
    cyan: '#06b6d4',
  },

  // Status
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',

  // Ring focus
  ring: '#3b82f6',

  // Shadows (darker)
  shadow: '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
  'shadow-lg': '0 10px 15px rgba(0, 0, 0, 0.3), 0 4px 6px rgba(0, 0, 0, 0.15)',
  'shadow-xl': '0 20px 25px rgba(0, 0, 0, 0.3), 0 10px 10px rgba(0, 0, 0, 0.2)',

  // Radius (same)
  'radius-sm': 6,
  'radius-md': 8,
  'radius-lg': 12,
  'radius-xl': 16,

  // Font
  'font-sans': 'System',
};

export type Theme = typeof lightTheme;