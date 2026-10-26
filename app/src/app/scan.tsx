import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Title } from '@/components/ui';
import { analyzePhoto, ScanError, type AnalyzeError } from '@/lib/api';
import { persistPhoto, pickPhoto, preparePhoto, type PhotoSource } from '@/lib/image';
import { showPaywall } from '@/lib/purchases';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

type Phase =
  | { kind: 'picking' }
  | { kind: 'preview'; uri: string }
  | { kind: 'analyzing'; uri: string }
  | { kind: 'error'; uri: string | null; code: AnalyzeError | 'permission' };

const STEP_KEYS = ['scan_step1', 'scan_step2', 'scan_step3'] as const;

export default function Scan() {
  const { source } = useLocalSearchParams<{ source?: PhotoSource }>();
  const { t, settings, updateSettings, addItem } = useStore();
  const c = useTheme();
  const [phase, setPhase] = useState<Phase>({ kind: 'picking' });
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    pickPhoto(source === 'library' ? 'library' : 'camera')
      .then((uri) => (uri ? setPhase({ kind: 'preview', uri }) : router.back()))
      .catch(() => setPhase({ kind: 'error', uri: null, code: 'permission' }));
  }, [source]);

  // Fake-but-honest progress: the steps match what the server does, in order.
  useEffect(() => {
    if (phase.kind !== 'analyzing') return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1)), 2500);
    return () => clearInterval(id);
  }, [phase.kind]);

  async function analyze(uri: string, afterPaywall = false) {
    setStep(0);
    setPhase({ kind: 'analyzing', uri });
    try {
      const photo = await preparePhoto(uri);
      const appraisal = await analyzePhoto(photo.base64, settings, notes);
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
      addItem({
        id,
        createdAt: Date.now(),
        imageUri: persistPhoto(photo.uri, id),
        currency: settings.currency,
        appraisal,
        buyPrice: null,
        status: 'inventory',
        soldPrice: null,
        soldAt: null,
      });
      const scansCompleted = settings.scansCompleted + 1;
      updateSettings({ scansCompleted });
      // Ask for a rating right after a "wow" moment, but not on the very first scan.
      if (scansCompleted === 2 || scansCompleted === 10) StoreReview.requestReview().catch(() => {});
      router.replace({ pathname: '/item/[id]', params: { id } });
    } catch (err) {
      const code = err instanceof ScanError ? err.code : 'network';
      if (code === 'paywall' && !afterPaywall) {
        const purchased = await showPaywall().catch(() => false);
        if (purchased) return analyze(uri, true);
        return router.back();
      }
      setPhase({ kind: 'error', uri, code });
    }
  }

  const errorText = (code: AnalyzeError | 'permission') =>
    ({
      permission: t('scan_permission'),
      not_item: t('scan_not_item'),
      daily_limit: t('scan_daily_limit'),
      paywall: t('scan_failed_body'),
      network: t('scan_failed_body'),
    })[code];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {phase.kind === 'picking' && <ActivityIndicator style={styles.safe} color={c.brand} />}

        {phase.kind !== 'picking' && phase.uri && (
          <Image source={{ uri: phase.uri }} style={styles.photo} contentFit="cover" />
        )}

        <View style={styles.panel}>
          {phase.kind === 'preview' && (
            <>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t('scan_notes_placeholder')}
                placeholderTextColor={c.muted}
                maxLength={300}
                style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
              />
              <Button title={t('home_title')} onPress={() => analyze(phase.uri)} />
              <Button title={t('cancel')} variant="secondary" onPress={() => router.back()} />
            </>
          )}

          {phase.kind === 'analyzing' && (
            <View style={styles.analyzing}>
              <ActivityIndicator size="large" color={c.brand} />
              <Title>{t('scan_analyzing')}</Title>
              {STEP_KEYS.map((k, i) => (
                <Text key={k} style={[styles.step, { color: i <= step ? c.text : c.muted }]}>
                  {i < step ? '✓' : i === step ? '•' : '○'}  {t(k)}
                </Text>
              ))}
            </View>
          )}

          {phase.kind === 'error' && (
            <>
              <Title>{t('scan_failed')}</Title>
              <Body muted>{errorText(phase.code)}</Body>
              {phase.uri && phase.code === 'network' && (
                <Button title={t('tryAgain')} onPress={() => analyze(phase.uri!)} />
              )}
              <Button title={t('cancel')} variant="secondary" onPress={() => router.back()} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  photo: { flex: 1, margin: 16, borderRadius: 24 },
  panel: { padding: 20, gap: 12 },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 16 },
  analyzing: { alignItems: 'flex-start', gap: 8 },
  step: { fontSize: 17, fontWeight: '600' },
});
