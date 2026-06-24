import React from 'react';
import { ActivityIndicator, Pressable, Text, View, type PressableProps, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/theme/ThemeProvider';

type Variant = 'primary' | 'warm' | 'ghost' | 'outline';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  size?: 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
};

export function PrimaryButton({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  style,
  fullWidth,
  ...rest
}: Props) {
  const { theme } = useTheme();
  const height = size === 'lg' ? 56 : 48;
  const fontSize = size === 'lg' ? 16 : 15;
  const radius = 14;

  if (variant === 'ghost' || variant === 'outline') {
    return (
      <Pressable
        disabled={disabled || loading}
        style={({ pressed }) => [
          {
            height,
            borderRadius: radius,
            paddingHorizontal: 22,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
            backgroundColor: variant === 'ghost' ? 'transparent' : theme.surface,
            borderWidth: variant === 'outline' ? 1.5 : 0,
            borderColor: theme.borderStrong,
            width: fullWidth ? '100%' : undefined,
          },
          style,
        ]}
        {...rest}
      >
        {icon}
        <Text style={{ color: theme.text, fontSize, fontWeight: '600' }}>{label}</Text>
      </Pressable>
    );
  }

  const gradient = variant === 'warm' ? theme.gradientWarm : theme.gradientPrimary;

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
      {...rest}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height,
          borderRadius: radius,
          paddingHorizontal: 22,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            {icon ? <View>{icon}</View> : null}
            <Text style={{ color: '#FFFFFF', fontSize, fontWeight: '700', letterSpacing: 0.3 }}>
              {label}
            </Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export default PrimaryButton;
