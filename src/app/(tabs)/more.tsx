import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/components/animated-entrance';
import { IconSymbol, type IconSymbolName } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, useTheme } from '@/design';

type Item = { title: string; subtitle: string; icon: IconSymbolName; href: Href };

// Left inset so row separators align under the title (icon circle + gap).
const ROW_TEXT_INSET = Spacing.lg + 38 + Spacing.md;

const ITEMS: Item[] = [
  { title: 'Deductions', subtitle: 'Lower your tax bill', icon: 'tag.fill', href: '/deductions' },
  { title: 'Reports', subtitle: 'Accountant-ready PDF', icon: 'doc.text.fill', href: '/reports' },
  {
    title: 'Assistant',
    subtitle: 'AI answers for your tax questions',
    icon: 'sparkles',
    href: '/ask',
  },
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
  const theme = useTheme();
  const version = Constants.expoConfig?.version;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AnimatedEntrance index={0}>
          <ThemedText variant="screenTitle" style={styles.title}>
            More
          </ThemedText>
        </AnimatedEntrance>

        <AnimatedEntrance index={1}>
          <View
            style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {ITEMS.map((item, i) => (
              <Fragment key={item.title}>
                <MoreRow item={item} onPress={() => router.navigate(item.href)} />
                {i < ITEMS.length - 1 && (
                  <View style={[styles.separator, { backgroundColor: theme.border }]} />
                )}
              </Fragment>
            ))}
          </View>
        </AnimatedEntrance>

        <AnimatedEntrance index={2}>
          <View style={styles.footer}>
            <IconSymbol name="leaf.fill" color={theme.primary} size={16} />
            <ThemedText variant="caption" color="textTertiary">
              Taxnest{version ? ` · v${version}` : ''}
            </ThemedText>
          </View>
        </AnimatedEntrance>
      </ScrollView>
    </Screen>
  );
}

function MoreRow({ item, onPress }: { item: Item; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: theme.primaryTint }]}>
        <IconSymbol name={item.icon} color={theme.primary} size={19} />
      </View>
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
  content: { gap: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl },
  title: { paddingBottom: Spacing.xs },
  group: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: { flex: 1, gap: 2 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: ROW_TEXT_INSET },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
  },
});
