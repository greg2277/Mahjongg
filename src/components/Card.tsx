import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';

type CardProps = ViewProps & {
  variant?: 'default' | 'elevated' | 'outline';
  padding?: number;
  style?: ViewStyle;
};

export function Card({ children, variant = 'default', padding = 16, style, ...rest }: CardProps) {
  const { theme } = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding,
    borderWidth: variant === 'outline' ? 1 : 1,
    borderColor: theme.border,
  };
  const elevated: ViewStyle =
    variant === 'elevated'
      ? {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 12,
          elevation: 4,
        }
      : {};

  return (
    <View style={[base, elevated, style]} {...rest}>
      {children}
    </View>
  );
}
