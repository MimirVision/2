import * as StoreReview from 'expo-store-review';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Chip, Label, Title, Body } from '@/components/ui';
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/lib/config';
import type { StringKey } from '@/lib/i18n';
import { COUNTRIES, countryFor, defaultMarketplaces } from '@/lib/markets';
import { openCustomerCenter, restorePurchases, showPaywall, usePro } from '@/lib/purchases';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { Language } from '@/lib/types';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'nb', label: 'Norsk' },
  { code: 'en', label: 'English' },
];

export default function SettingsScreen() {
  const { t, settings, updateSettings } = useStore();
  const c = useTheme();
  const pro = usePro();
  const country = countryFor(settings.country);

  async function restore() {
    try {
      Alert.alert((await restorePurchases()) ? t('set_restored') : t('set_nothing_restored'));
    } catch {
      Alert.alert(t('scan_failed_body'));
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Title>{t('set_title')}</Title>

        <Label>{t('set_subscription')}</Label>
        <Card>
          {pro ? (
            <>
              <Body>✓ {t('set_pro_active')}</Body>
              <Button title={t('set_manage')} variant="secondary" onPress={() => openCustomerCenter()} />
            </>
          ) : (
            <Button title={t('set_upgrade')} onPress={() => showPaywall().catch(() => {})} />
          )}
          <Button title={t('set_restore')} variant="secondary" onPress={restore} />
        </Card>

        <Label>{t('set_language')}</Label>
        <View style={styles.row}>
          {LANGUAGES.map((l) => (
            <Chip
              key={l.code}
              label={l.label}
              selected={settings.language === l.code}
              onPress={() => updateSettings({ language: l.code })}
            />
          ))}
        </View>

        <Label>{t('set_country')}</Label>
        <View style={styles.row}>
          {COUNTRIES.map((co) => (
            <Chip
              key={co.code}
              label={t(`country_${co.code}` as StringKey)}
              selected={settings.country === co.code}
              onPress={() =>
                updateSettings({ country: co.code, currency: co.currency, marketplaces: defaultMarketplaces(co.code) })
              }
            />
          ))}
        </View>

        <Label>{t('set_markets')}</Label>
        <View style={styles.row}>
          {country.marketplaces.map((m) => {
            const selected = settings.marketplaces.includes(m);
            return (
              <Chip
                key={m}
                label={m}
                selected={selected}
                onPress={() => {
                  const next = selected ? settings.marketplaces.filter((x) => x !== m) : [...settings.marketplaces, m];
                  if (next.length > 0) updateSettings({ marketplaces: next });
                }}
              />
            );
          })}
        </View>

        <Card>
          <Button title={t('set_rate')} variant="secondary" onPress={() => StoreReview.requestReview().catch(() => {})} />
          <Button
            title={t('set_support')}
            variant="secondary"
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Flipp`)}
          />
          <Button title={t('set_privacy')} variant="secondary" onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Button title={t('set_terms')} variant="secondary" onPress={() => Linking.openURL(TERMS_URL)} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
