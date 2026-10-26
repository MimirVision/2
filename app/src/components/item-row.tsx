import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/lib/money';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { Item } from '@/lib/types';
import { LOCALE } from '@/lib/i18n';

export function ItemRow({ item }: { item: Item }) {
  const { t, settings } = useStore();
  const c = useTheme();
  const locale = LOCALE[settings.language];
  const price =
    item.status === 'sold' && item.soldPrice !== null ? item.soldPrice : item.appraisal.price.typical;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
      style={({ pressed }) => [styles.row, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}>
      <Image source={{ uri: item.imageUri }} style={styles.thumb} contentFit="cover" />
      <View style={styles.middle}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
          {item.appraisal.title}
        </Text>
        <Text style={[styles.status, { color: item.status === 'sold' ? c.brand : c.muted }]}>
          {t(`item_status_${item.status}`)}
        </Text>
      </View>
        <Text style={[styles.price, { color: c.text }]}>{formatMoney(price, item.currency, locale)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 60, height: 60, borderRadius: 12 },
  middle: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '600' },
  status: { fontSize: 13, fontWeight: '600' },
  price: { fontSize: 16, fontWeight: '800' },
});
