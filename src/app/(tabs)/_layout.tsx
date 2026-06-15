import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/icon-symbol';
import { Radius, useTheme } from '@/design';

/**
 * Bottom tab bar (PRD §8.0): Home · Income · [ + ] · Taxes · More.
 * The center [+] is the global primary action — it opens the Add income
 * bottom sheet (modal) rather than navigating to a tab.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol name="house.fill" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: 'Income',
          tabBarIcon: ({ color }) => <IconSymbol name="list.bullet" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarButton: () => (
            <View style={styles.centerSlot} pointerEvents="box-none">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add income"
                onPress={() => router.navigate('/add-income')}
                style={[styles.centerButton, { backgroundColor: theme.primary }]}>
                <IconSymbol name="plus" color="#FFFFFF" size={28} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="taxes"
        options={{
          title: 'Taxes',
          tabBarIcon: ({ color }) => <IconSymbol name="calendar" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <IconSymbol name="ellipsis" color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
  },
});
