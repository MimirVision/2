import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemRow } from '@/components/item-row';
import { Body, Button, Card, Label, Stat, Title } from '@/components/ui';
import { LOCALE } from '@/lib/i18n';
import { formatMoney, totals } from '@/lib/money';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function Home() {
  const { t, items, settings } = useStore();
  const c = useTheme();
  const sum = totals(items);
  const money = (n: number) => formatMoney(n, settings.currency, LOCALE[settings.language]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Title>{t('home_title')}</Title>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/scan', params: { source: 'camera' } })}
          style={({ pressed }) => [styles.scan, { backgroundColor: c.brand, opacity: pressed ? 0.85 : 1 }]}>
          <Text style={styles.scanIcon}>📷</Text>
          <Text style={[styles.scanTitle, { color: c.brandText }]}>{t('home_scan')}</Text>
          <Text style={[styles.scanSub, { color: c.brandText }]}>{t('home_scan_sub')}</Text>
        </Pressable>
        <Button
          title={t('home_library')}
          variant="secondary"
          onPress={() => router.push({ pathname: '/scan', params: { source: 'library' } })}
        />

        {items.length > 0 ? (
          <>
            <Card style={styles.stats}>
              <Stat label={t('home_potential')} value={money(sum.potentialProfit)} />
              <Stat label={t('home_earned')} value={money(sum.realizedProfit)} />
              <Stat label={t('home_items')} value={String(sum.unsoldCount)} />
            </Card>
            <Label>{t('home_recent')}</Label>
            <View style={{ gap: 8 }}>
              {items.slice(0, 5).map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </View>
          </>
        ) : (
          <Body muted style={{ textAlign: 'center', marginTop: 8 }}>
            {t('home_empty')}
          </Body>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  scan: { borderRadius: 24, paddingVertical: 36, alignItems: 'center', gap: 6 },
  scanIcon: { fontSize: 48 },
  scanTitle: { fontSize: 24, fontWeight: '800' },
  scanSub: { fontSize: 15, opacity: 0.85 },
  stats: { flexDirection: 'row', gap: 12 },
});
