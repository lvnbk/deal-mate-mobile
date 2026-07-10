import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import Toast from "react-native-toast-message";
import type { PurchasesPackage } from "react-native-purchases";
import GradientButton from "@/components/GradientButton";
import {
  getRemoveAdsPackage,
  purchaseRemoveAds,
  restoreRemoveAds
} from "@/lib/purchases";
import { useAdsRemoved } from "@/lib/prefs";
import { useFeatureFlag, flags } from "@/lib/featureFlags";
import { colors, spacing, radii, gradients } from "@/constants/theme";

const BENEFITS = [
  "benefitBanner",
  "benefitInterstitial",
  "benefitSupport"
] as const;

// Apple requires a Terms of Use (EULA) and Privacy Policy link on any paywall.
// Terms defaults to Apple's standard EULA; swap for your own if you have one.
const TERMS_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const PRIVACY_URL = "https://giatot.tech/privacy/";

export default function PaywallScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: adsRemoved } = useAdsRemoved();
  const showIap = useFeatureFlag(flags.showIap);

  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // If IAP is disabled remotely (and nothing to show a purchased user), leave.
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
          type: "success",
          text1: t("paywall.purchased"),
          position: "bottom"
        });
        close();
      }
    } catch (e: any) {
      // User cancelling the native sheet is not an error worth surfacing.
      if (!e?.userCancelled) {
        Toast.show({
          type: "error",
          text1: t("paywall.failed"),
          position: "bottom"
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
        type: active ? "success" : "info",
        text1: active ? t("paywall.restored") : t("paywall.nothingToRestore"),
        position: "bottom"
      });
      if (active) close();
    } catch {
      Toast.show({
        type: "error",
        text1: t("paywall.failed"),
        position: "bottom"
      });
    } finally {
      setBusy(false);
    }
  };

  const price = pkg?.product.priceString;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={close} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Ionicons name="sparkles" size={44} color={colors.onPrimary} />
        </LinearGradient>

        <Text style={styles.title}>{t("paywall.title")}</Text>
        <Text style={styles.subtitle}>{t("paywall.subtitle")}</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((key) => (
            <View key={key} style={styles.benefitRow}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.benefitText}>{t(`paywall.${key}`)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {adsRemoved ? (
          <View style={styles.activeBox}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.activeText}>{t("paywall.alreadyActive")}</Text>
          </View>
        ) : loading ? (
          <ActivityIndicator />
        ) : pkg ? (
          <>
            <GradientButton
              label={t("paywall.buy", { price })}
              onPress={onPurchase}
              disabled={busy}
            />
            <Text style={styles.oneTime}>{t("paywall.oneTime")}</Text>
          </>
        ) : (
          <Text style={styles.unavailable}>{t("paywall.unavailable")}</Text>
        )}

        {!adsRemoved && (
          <TouchableOpacity onPress={onRestore} disabled={busy} hitSlop={8}>
            <Text style={styles.restore}>{t("paywall.restore")}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.legalRow}>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>{t("paywall.terms")}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>{t("paywall.privacy")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  body: { flex: 1, alignItems: "center", paddingHorizontal: spacing.xl },
  hero: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20
  },
  benefits: { alignSelf: "stretch", marginTop: spacing.xl, gap: spacing.md },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  benefitText: { flex: 1, fontSize: 15, color: colors.text },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md
  },
  oneTime: { fontSize: 12, color: colors.muted, textAlign: "center" },
  restore: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: spacing.sm
  },
  unavailable: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center"
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm
  },
  legalLink: {
    fontSize: 12,
    color: colors.muted,
    textDecorationLine: "underline"
  },
  legalDot: { fontSize: 12, color: colors.muted },
  activeBox: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm
  },
  activeText: { fontSize: 15, fontWeight: "500", color: colors.text }
});
