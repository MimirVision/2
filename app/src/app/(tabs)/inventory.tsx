import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemRow } from '@/components/item-row';
import { Body, Card, Chip, Stat, Title } from '@/components/ui';
import { LOCALE } from '@/lib/i18n';
import { formatMoney, totals } from '@/lib/money';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { ItemStatus } from '@/lib/types';

const FILTERS: (ItemStatus | 'all')[] = ['all', 'inventory', 'listed', 'sold'];

export default function Inventory() {
  const { t, items, settings } = useStore();
  const c = useTheme();
  const [filter, setFilter] = useState<ItemStatus | 'all'>('all');
  const shown = filter === 'all' ? items : items.filter((i) => i.status === filter);
  const sum = totals(items);
  const money = (n: number) => formatMoney(n, settings.currency, LOCALE[settings.language]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={shown}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 14 }}>
            <Title>{t('inv_title')}</Title>
            <Card style={{ flexDirection: 'row', gap: 12 }}>
              <Stat label={t('home_potential')} value={money(sum.potentialProfit)} />
              <Stat label={t('home_earned')} value={money(sum.realizedProfit)} />
            </Card>
            <View style={styles.filters}>
              {FILTERS.map((f) => (
                <Chip
                  key={f}
                  label={f === 'all' ? t('inv_filter_all') : t(`item_status_${f}`)}
                  selected={filter === f}
                  onPress={() => setFilter(f)}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={<Body muted>{t('inv_empty')}</Body>}
        renderItem={({ item }) => <ItemRow item={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
