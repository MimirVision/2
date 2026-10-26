import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Chip, Label } from '@/components/ui';
import { LOCALE } from '@/lib/i18n';
import { MARKETPLACES } from '@/lib/markets';
import { formatMoney, itemProfit, parseAmount } from '@/lib/money';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { ItemStatus, Listing } from '@/lib/types';

const STATUSES: ItemStatus[] = ['inventory', 'listed', 'sold'];

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, t, settings, updateItem, removeItem } = useStore();
  const c = useTheme();
  const item = items.find((i) => i.id === id);
  const [listingIndex, setListingIndex] = useState(0);

  if (!item) return null;
  const a = item.appraisal;
  const money = (n: number) => formatMoney(n, item.currency, LOCALE[settings.language]);
  const listing: Listing | undefined = a.listings[listingIndex] ?? a.listings[0];
  const profit = itemProfit(item);

  function confirmDelete() {
    Alert.alert(t('item_delete_confirm'), undefined, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          router.back();
          removeItem(item!.id);
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: a.brand ?? '' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={{ uri: item.imageUri }} style={styles.photo} contentFit="cover" />
        <Text style={[styles.title, { color: c.text }]}>{a.title}</Text>
        <Body muted>
          {t(`cond_${a.condition}`)} · {t(`item_demand_${a.demand}`)} · {t('item_days', { days: a.daysToSell })}
        </Body>

        <Card style={{ backgroundColor: c.brandSoft, borderColor: c.brand }}>
          <Label>{t('item_value')}</Label>
          <Text style={[styles.price, { color: c.text }]}>{money(a.price.typical)}</Text>
          <View style={styles.priceRow}>
            <Body muted>
              {t('item_range')}: {money(a.price.low)} – {money(a.price.high)}
            </Body>
            <Body muted>
              {t('item_quick')}: {money(a.price.quickSale)}
            </Body>
          </View>
          <Body muted>{t('item_confidence', { pct: Math.round(a.confidence * 100) })}</Body>
        </Card>

        <Card>
          <Label>{t('item_paid')}</Label>
          <TextInput
            defaultValue={item.buyPrice !== null ? String(item.buyPrice) : ''}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={c.muted}
            onEndEditing={(e) => updateItem(item.id, { buyPrice: parseAmount(e.nativeEvent.text) })}
            style={[styles.input, { color: c.text, borderColor: c.border }]}
          />
          <Body>
            {t('item_profit')}:{' '}
            <Text style={{ fontWeight: '800', color: profit >= 0 ? c.brand : c.danger }}>{money(profit)}</Text>
          </Body>
        </Card>

        {listing && (
          <>
            <Label>{t('item_listings')}</Label>
            <View style={styles.wrap}>
              {a.listings.map((l, i) => (
                <Chip key={l.marketplace} label={l.marketplace} selected={i === listingIndex} onPress={() => setListingIndex(i)} />
              ))}
            </View>
            <Card>
              <Text style={[styles.listingTitle, { color: c.text }]} selectable>
                {listing.title}
              </Text>
              <Text style={[styles.listingBody, { color: c.text }]} selectable>
                {listingText(listing)}
              </Text>
              <CopyButton label={t('item_copy_title')} done={t('item_copied')} text={listing.title} />
              <CopyButton label={t('item_copy_text')} done={t('item_copied')} text={listingText(listing)} />
              {MARKETPLACES[listing.marketplace] && (
                <Button
                  title={t('item_compare', { market: listing.marketplace })}
                  variant="secondary"
                  onPress={() => Linking.openURL(MARKETPLACES[listing.marketplace].searchUrl(a.searchQuery))}
                />
              )}
            </Card>
          </>
        )}

        <Card>
          <Label>{t('item_why')}</Label>
          <Body>{a.priceReasoning}</Body>
          {a.conditionNotes ? <Body muted>{a.conditionNotes}</Body> : null}
        </Card>

        {a.tips.length > 0 && (
          <Card>
            <Label>{t('item_tips')}</Label>
            {a.tips.map((tip) => (
              <Body key={tip}>•  {tip}</Body>
            ))}
          </Card>
        )}

        {a.authenticityChecks.length > 0 && (
          <Card>
            <Label>{t('item_auth')}</Label>
            {a.authenticityChecks.map((check) => (
              <Body key={check}>•  {check}</Body>
            ))}
          </Card>
        )}

        <Label>{t('item_status')}</Label>
        <View style={styles.wrap}>
          {STATUSES.map((s) => (
            <Chip
              key={s}
              label={t(`item_status_${s}`)}
              selected={item.status === s}
              onPress={() =>
                updateItem(item.id, {
                  status: s,
                  soldAt: s === 'sold' ? Date.now() : null,
                  soldPrice: s === 'sold' ? (item.soldPrice ?? a.price.typical) : null,
                })
              }
            />
          ))}
        </View>
        {item.status === 'sold' && (
          <Card>
            <Label>{t('item_sold_for')}</Label>
            <TextInput
              defaultValue={String(item.soldPrice ?? a.price.typical)}
              keyboardType="number-pad"
              onEndEditing={(e) => updateItem(item.id, { soldPrice: parseAmount(e.nativeEvent.text) ?? 0 })}
              style={[styles.input, { color: c.text, borderColor: c.border }]}
            />
          </Card>
        )}

        <Body muted style={{ fontSize: 13 }}>
          {t('item_estimate_note')}
        </Body>
        <Button title={t('delete')} variant="danger" onPress={confirmDelete} />
      </ScrollView>
    </>
  );
}

/** Description plus hashtags, ready to paste. */
function listingText(l: Listing): string {
  const tags = l.tags.map((tag) => `#${tag.replace(/^#/, '').replace(/\s+/g, '')}`).join(' ');
  return tags ? `${l.description}\n\n${tags}` : l.description;
}

function CopyButton({ label, done, text }: { label: string; done: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      title={copied ? done : label}
      variant="secondary"
      onPress={async () => {
        await Clipboard.setStringAsync(text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 60 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 24 },
  title: { fontSize: 24, fontWeight: '800' },
  price: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  priceRow: { gap: 2 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 18 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listingTitle: { fontSize: 17, fontWeight: '700' },
  listingBody: { fontSize: 15, lineHeight: 21 },
});
