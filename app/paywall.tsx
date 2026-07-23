import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import Toast from 'react-native-toast-message';
import type { PurchasesPackage } from 'react-native-purchases';
import GradientButton from '@/components/GradientButton';
import {
  getRemoveAdsPackage,
  purchaseRemoveAds,
  restoreRemoveAds,
} from '@/lib/purchases';
import { useAdsRemoved } from '@/lib/prefs';
import { useFeatureFlag, flags } from '@/lib/featureFlags';
import { useStyles, type Theme } from '@/constants/theme';

const BENEFITS = ['benefitBanner', 'benefitInterstitial', 'benefitSupport'] as const;

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://giatot.tech/privacy/';

export default function PaywallScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [styles, theme] = useStyles(createStyles);
  const { data: adsRemoved } = useAdsRemoved();
  const showIap = useFeatureFlag(flags.showIap);

  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!showIap && !adsRemoved) router.back();
  }, [showIap, adsRemoved, router]);

  useEffect(() => {
    let alive = true;
    getRemoveAdsPackage()
      .then((p) => alive && setPkg(p))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const close = () => router.back();

  const onPurchase = async () => {
    if (!pkg || busy) return;
    setBusy(true);
    try {
      const active = await purchaseRemoveAds(pkg);
      if (active) {
        Toast.show({
          type: 'success',
          text1: t('paywall.purchased'),
          position: 'bottom',
        });
        close();
      }
    } catch (e: any) {
      if (!e?.userCancelled) {
        Toast.show({
          type: 'error',
          text1: t('paywall.failed'),
          position: 'bottom',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const active = await restoreRemoveAds();
      Toast.show({
        type: active ? 'success' : 'info',
        text1: active ? t('paywall.restored') : t('paywall.nothingToRestore'),
        position: 'bottom',
      });
      if (active) close();
    } catch {
      Toast.show({
        type: 'error',
        text1: t('paywall.failed'),
        position: 'bottom',
      });
    } finally {
      setBusy(false);
    }
  };

  const price = pkg?.product.priceString;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={close} hitSlop={12} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <LinearGradient
          colors={theme.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Ionicons name="sparkles" size={44} color={theme.colors.onPrimary} />
        </LinearGradient>

        <Text style={styles.title}>{t('paywall.title')}</Text>
        <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((key) => (
            <View key={key} style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.benefitText}>{t(`paywall.${key}`)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {adsRemoved ? (
          <View style={styles.activeBox}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            <Text style={styles.activeText}>{t('paywall.alreadyActive')}</Text>
          </View>
        ) : loading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : pkg ? (
          <>
            <GradientButton
              label={t('paywall.buy', { price })}
              onPress={onPurchase}
              disabled={busy}
            />
            <Text style={styles.oneTime}>{t('paywall.oneTime')}</Text>
          </>
        ) : (
          <Text style={styles.unavailable}>{t('paywall.unavailable')}</Text>
        )}

        {!adsRemoved && (
          <TouchableOpacity onPress={onRestore} disabled={busy} hitSlop={8}>
            <Text style={styles.restore}>{t('paywall.restore')}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.legalRow}>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>{t('paywall.terms')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>{t('paywall.privacy')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (t: Theme) => ({
  container: { flex: 1, backgroundColor: t.colors.bg },
  topBar: {
    alignItems: 'flex-end' as const,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: t.radii.full,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: t.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  body: {
    flex: 1,
    alignItems: 'center' as const,
    paddingHorizontal: t.spacing.xl,
  },
  hero: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: t.spacing.xl,
    marginBottom: t.spacing.xl,
    ...t.elevation.brand,
  },
  title: {
    ...t.typography.h1,
    fontSize: 26,
    color: t.colors.text,
    textAlign: 'center' as const,
  },
  subtitle: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: t.spacing.sm,
    lineHeight: 22,
  },
  benefits: {
    alignSelf: 'stretch' as const,
    marginTop: t.spacing.xl,
    gap: t.spacing.md,
  },
  benefitRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
  },
  benefitIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: t.colors.primaryBg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  benefitText: {
    flex: 1,
    ...t.typography.body,
    fontSize: 15,
    color: t.colors.text,
  },
  footer: {
    paddingHorizontal: t.spacing.xl,
    paddingBottom: t.spacing.xl,
    gap: t.spacing.md,
  },
  oneTime: {
    fontSize: 12,
    color: t.colors.muted,
    textAlign: 'center' as const,
  },
  restore: {
    fontSize: 14,
    color: t.colors.primary,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    paddingVertical: t.spacing.sm,
  },
  unavailable: {
    fontSize: 14,
    color: t.colors.textSecondary,
    textAlign: 'center' as const,
  },
  legalRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
  },
  legalLink: {
    fontSize: 12,
    color: t.colors.muted,
    textDecorationLine: 'underline' as const,
  },
  legalDot: { fontSize: 12, color: t.colors.muted },
  activeBox: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
  },
  activeText: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
});
