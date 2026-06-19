import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IconSymbol, type IconSymbolName } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, useTheme } from '@/design';

type Item = { title: string; subtitle: string; icon: IconSymbolName; href: Href };

const ITEMS: Item[] = [
  { title: 'Deductions', subtitle: 'Lower your tax bill', icon: 'tag.fill', href: '/deductions' },
  { title: 'Reports', subtitle: 'Accountant-ready PDF', icon: 'doc.text.fill', href: '/reports' },
  { title: 'Ask', subtitle: 'Tax questions, answered', icon: 'bubble.left.fill', href: '/ask' },
  {
    title: 'Settings',
    subtitle: 'Profile, notifications, more',
    icon: 'gearshape.fill',
    href: '/settings',
  },
];

/** More hub (PRD §8.0): Deductions, Reports, Ask, Settings. */
export default function MoreScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="screenTitle" style={styles.title}>
          More
        </ThemedText>
        {ITEMS.map((item) => (
          <MoreRow key={item.title} item={item} onPress={() => router.navigate(item.href)} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function MoreRow({ item, onPress }: { item: Item; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <IconSymbol name={item.icon} color={theme.primary} size={22} />
      <View style={styles.rowMain}>
        <ThemedText variant="body">{item.title}</ThemedText>
        <ThemedText variant="caption" color="textTertiary">
          {item.subtitle}
        </ThemedText>
      </View>
      <IconSymbol name="chevron.right" color={theme.textTertiary} size={14} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl },
  title: { paddingBottom: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
  },
  rowMain: { flex: 1, gap: 2 },
});
