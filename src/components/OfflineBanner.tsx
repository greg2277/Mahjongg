import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeProvider';
import { formatLastSync, useOnlineStatus } from '@/src/lib/offline';

/** Compact pill shown when offline; informs user lessons are still available. */
export function OfflineBanner() {
  const { theme } = useTheme();
  const { online, lastSync } = useOnlineStatus();

  if (online) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: theme.gold + '22',
        borderWidth: 1,
        borderColor: theme.gold + '55',
        marginBottom: 12,
      }}
    >
      <Ionicons name="cloud-offline" size={14} color={theme.gold} />
      <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700', flex: 1 }}>
        Offline mode
      </Text>
      <Text style={{ color: theme.textSubtle, fontSize: 11, fontWeight: '600' }}>
        Synced {formatLastSync(lastSync)}
      </Text>
    </View>
  );
}
