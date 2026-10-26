import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Card, Chip, Title } from '@/components/ui';
import { type StringKey } from '@/lib/i18n';
import { COUNTRIES, countryFor, defaultMarketplaces } from '@/lib/markets';
import { formatMoney } from '@/lib/money';
import { showPaywall } from '@/lib/purchases';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

/**
 * Quiz-style onboarding: each answer personalises the app (country → currency and marketplaces)
 * and builds commitment before the paywall, which is the pattern top-grossing utility apps use.
 */
const STEPS = ['welcome', 'country', 'what', 'frequency', 'markets', 'goal', 'plan'] as const;

const WHAT: StringKey[] = [
  'ob_what_clothes',
  'ob_what_electronics',
  'ob_what_furniture',
  'ob_what_kids',
  'ob_what_collectibles',
  'ob_what_sports',
];
const FREQUENCY: StringKey[] = ['ob_freq_once', 'ob_freq_monthly', 'ob_freq_weekly'];
// Goals in "units" that are scaled by currency so they look natural in each market.
const GOALS = [500, 2000, 5000, 10000];
const GOAL_SCALE: Record<string, number> = { NOK: 1, SEK: 1, DKK: 0.7, USD: 0.1, GBP: 0.08, EUR: 0.09 };

export default function Onboarding() {
  const { settings, updateSettings, t } = useStore();
  const c = useTheme();
  const [step, setStep] = useState(0);
  const [what, setWhat] = useState<StringKey[]>([]);
  const [frequency, setFrequency] = useState<StringKey | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);

  const current = STEPS[step];
  const country = countryFor(settings.country);
  const scale = GOAL_SCALE[settings.currency] ?? 1;
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const canContinue =
    (current === 'what' && what.length > 0) ||
    (current === 'frequency' && frequency !== null) ||
    (current === 'markets' && settings.marketplaces.length > 0) ||
    (current === 'goal' && goal !== null) ||
    current === 'country';

  async function finish() {
    setFinishing(true);
    try {
      // Paywall right after the "plan" moment converts best. Closing it still lets the
      // user try one free scan; the server enforces the paywall after that.
      await showPaywall();
    } catch {
      // Paywall unavailable (e.g. offline) – let them in, the server still gates scans.
    }
    updateSettings({ onboarded: true, monthlyGoal: goal });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      {step > 0 && (
        <View style={[styles.progress, { backgroundColor: c.border }]}>
          <View style={[styles.progressFill, { backgroundColor: c.brand, width: `${(step / (STEPS.length - 1)) * 100}%` }]} />
        </View>
      )}
      <ScrollView contentContainerStyle={styles.content}>
        {current === 'welcome' && (
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>📸💰</Text>
            <Title>{t('ob_welcome_title')}</Title>
            <Body muted>{t('ob_welcome_body')}</Body>
          </View>
        )}

        {current === 'country' && (
          <>
            <Title>{t('ob_country_title')}</Title>
            {COUNTRIES.map((co) => (
              <Chip
                key={co.code}
                label={t(`country_${co.code}` as StringKey)}
                selected={settings.country === co.code}
                onPress={() =>
                  updateSettings({
                    country: co.code,
                    currency: co.currency,
                    marketplaces: defaultMarketplaces(co.code),
                    language: co.code === 'NO' ? 'nb' : settings.language,
                  })
                }
              />
            ))}
          </>
        )}

        {current === 'what' && (
          <>
            <Title>{t('ob_what_title')}</Title>
            {WHAT.map((k) => (
              <Chip key={k} label={t(k)} selected={what.includes(k)} onPress={() => setWhat(toggle(what, k))} />
            ))}
          </>
        )}

        {current === 'frequency' && (
          <>
            <Title>{t('ob_freq_title')}</Title>
            {FREQUENCY.map((k) => (
              <Chip key={k} label={t(k)} selected={frequency === k} onPress={() => setFrequency(k)} />
            ))}
          </>
        )}

        {current === 'markets' && (
          <>
            <Title>{t('ob_markets_title')}</Title>
            <Body muted>{t('ob_markets_body')}</Body>
            {country.marketplaces.map((m) => (
              <Chip
                key={m}
                label={m}
                selected={settings.marketplaces.includes(m)}
                onPress={() => updateSettings({ marketplaces: toggle(settings.marketplaces, m) })}
              />
            ))}
          </>
        )}

        {current === 'goal' && (
          <>
            <Title>{t('ob_goal_title')}</Title>
            {GOALS.map((g, i) => {
              const amount = Math.round(g * scale);
              const label = formatMoney(amount, settings.currency) + (i === GOALS.length - 1 ? '+' : '');
              return <Chip key={g} label={label} selected={goal === amount} onPress={() => setGoal(amount)} />;
            })}
          </>
        )}

        {current === 'plan' && (
          <>
            <Title>{t('ob_plan_title')}</Title>
            <Body muted>{t('ob_plan_body')}</Body>
            {goal !== null && (
              <Card style={{ backgroundColor: c.brandSoft, borderColor: c.brand }}>
                <Body muted>{t('ob_plan_goal')}</Body>
                <Text style={[styles.goal, { color: c.text }]}>{formatMoney(goal, settings.currency)}</Text>
              </Card>
            )}
            <Card>
              {[
                t('ob_plan_point1'),
                t('ob_plan_point2', { markets: settings.marketplaces.join(', ') }),
                t('ob_plan_point3'),
              ].map((p) => (
                <Body key={p}>✓  {p}</Body>
              ))}
            </Card>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {current === 'welcome' && <Button title={t('ob_welcome_cta')} onPress={next} />}
        {current === 'plan' && <Button title={t('ob_plan_cta')} onPress={finish} loading={finishing} />}
        {current !== 'welcome' && current !== 'plan' && (
          <Button title={t('continue')} onPress={next} disabled={!canContinue} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  progress: { height: 4, borderRadius: 2, marginHorizontal: 24, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  content: { padding: 24, gap: 12, flexGrow: 1 },
  hero: { flex: 1, justifyContent: 'center', gap: 16 },
  heroEmoji: { fontSize: 64 },
  goal: { fontSize: 34, fontWeight: '800' },
  footer: { padding: 24, paddingTop: 8 },
});
