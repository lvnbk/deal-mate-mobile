import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBarcodeLookup } from '@/lib/queries';
import { useOpenDeal } from '@/lib/ads';
import { analytics, events } from '@/lib/analytics';
import { DealCard } from '@/components/DealCard';
import GradientButton from '@/components/GradientButton';
import { useStyles, type Theme } from '@/constants/theme';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/**
 * Màn quét mã vạch. Một trong 3 trạng thái tại một thời điểm:
 *   1. Chưa có quyền camera → prompt.
 *   2. Chưa quét được gì → CameraView + overlay khung ngắm.
 *   3. Đã quét ra code → gọi backend lookup, hiện productName + list deals.
 * Reviewer App Store test trên đây: bấm vào deal → mở màn chi tiết deal
 * (đầy đủ chart lịch sử giá + nút đặt alert).
 */
export default function ScanScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [styles, theme] = useStyles(createStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState<string | null>(null);
  const openDeal = useOpenDeal();
  // Chống trigger onBarcodeScanned nhiều lần khi giữ camera trên cùng 1 mã.
  const scannedRef = useRef(false);

  const onBarcodeScanned = useCallback(
    (result: { data: string }) => {
      if (scannedRef.current) return;
      const raw = result.data.trim();
      if (!/^\d{6,14}$/.test(raw)) return; // ignore QR text/UPC-E chưa chuẩn
      scannedRef.current = true;
      analytics.capture(events.barcodeScan, { code: raw });
      setCode(raw);
    },
    [],
  );

  const onRescan = useCallback(() => {
    scannedRef.current = false;
    setCode(null);
  }, []);

  // ── State 1: quyền camera ────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <PermissionRequest
        canAskAgain={permission.canAskAgain}
        onRequest={async () => {
          const res = await requestPermission();
          if (!res.granted && !res.canAskAgain) void Linking.openSettings();
        }}
        onClose={() => router.back()}
      />
    );
  }

  // ── State 3: đã có code → results ────────────────────────────────────────
  if (code) {
    return <ResultsView code={code} onRescan={onRescan} onOpenDeal={openDeal} onBack={() => router.back()} />;
  }

  // ── State 2: đang quét ──────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={onBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
      />
      {/* Overlay: nút back + khung ngắm + hint text */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none" edges={['top', 'bottom']}>
        <View style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            hitSlop={10}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{t('scan.title')}</Text>
          <View style={styles.iconBtnPlaceholder} />
        </View>

        <View style={styles.aimWrap} pointerEvents="none">
          <View style={styles.aimBox}>
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
          </View>
        </View>

        <View style={styles.bottomBar} pointerEvents="none">
          <Text style={styles.aimText}>{t('scan.aim')}</Text>
          <Text style={styles.hintText}>{t('scan.hint')}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ── Subviews ──────────────────────────────────────────────────────────────

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const [styles] = useStyles(createStyles);
  return <View style={[styles.corner, styles[`corner_${pos}`]]} />;
}

function PermissionRequest({
  canAskAgain,
  onRequest,
  onClose,
}: {
  canAskAgain: boolean;
  onRequest: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [styles, theme] = useStyles(createStyles);
  return (
    <SafeAreaView style={styles.permBg} edges={['top', 'bottom']}>
      <View style={styles.permTop}>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={26} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.permBody}>
        <View style={styles.permIcon}>
          <Ionicons name="scan-outline" size={44} color={theme.colors.primary} />
        </View>
        <Text style={styles.permTitle}>{t('scan.permissionTitle')}</Text>
        <Text style={styles.permText}>
          {canAskAgain ? t('scan.permissionText') : t('scan.permissionDenied')}
        </Text>
        <GradientButton
          label={t('scan.permissionGrant')}
          onPress={onRequest}
          icon={<Ionicons name="camera-outline" size={18} color={theme.colors.onPrimary} />}
        />
      </View>
    </SafeAreaView>
  );
}

function ResultsView({
  code,
  onRescan,
  onOpenDeal,
  onBack,
}: {
  code: string;
  onRescan: () => void;
  onOpenDeal: (id: string) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [styles, theme] = useStyles(createStyles);
  const router = useRouter();
  const { data, isLoading, isError } = useBarcodeLookup(code);

  useEffect(() => {
    if (data) {
      analytics.capture(events.barcodeResult, {
        code,
        matched: !!data.productName,
        dealCount: data.deals.length,
      });
    }
  }, [data, code]);

  const searchByName = () => {
    if (!data?.productName) return;
    // Deep-link vào Home với query param nếu sau này thêm; tạm thời chỉ đóng
    // màn scan để user tự search — vẫn giữ path native, không mở web.
    router.replace(`/?q=${encodeURIComponent(data.productName)}`);
  };

  return (
    <SafeAreaView style={styles.resultsBg} edges={['top']}>
      <View style={styles.resultsHeader}>
        <TouchableOpacity onPress={onBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.resultsTitle} numberOfLines={1}>
          {t('scan.resultTitle', { code })}
        </Text>
        <TouchableOpacity onPress={onRescan} hitSlop={10}>
          <Ionicons name="scan-outline" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('scan.lookingUp', { code })}</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.muted} />
          <Text style={styles.loadingText}>{t('scan.error')}</Text>
          <View style={styles.rescanBtnWrap}>
            <GradientButton label={t('scan.rescan')} onPress={onRescan} />
          </View>
        </View>
      ) : (
        <FlatList
          data={data?.deals ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DealCard deal={item} onPress={() => onOpenDeal(item.id)} />}
          contentContainerStyle={styles.resultsList}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('scan.productLabel')}</Text>
              <Text style={styles.summaryProduct}>
                {data?.productName ?? t('scan.productUnknown')}
              </Text>
              {data?.productName && (
                <Text style={styles.summaryCount}>
                  {t('scan.dealsFound', { count: data.deals.length })}
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>{t('scan.noDeals')}</Text>
              {data?.productName && (
                <TouchableOpacity onPress={searchByName} style={styles.searchLink}>
                  <Ionicons name="search-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.searchLinkText}>{t('scan.searchByName')}</Text>
                </TouchableOpacity>
              )}
              <View style={styles.rescanBtnWrap}>
                <GradientButton label={t('scan.rescan')} onPress={onRescan} />
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (t: Theme) => ({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
    backgroundColor: t.colors.bg,
    padding: t.spacing.xl,
  },
  loadingText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: 'center' as const,
  },

  // Camera overlay
  overlay: {
    ...({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }),
    justifyContent: 'space-between' as const,
  },
  topBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: t.spacing.lg,
    paddingTop: Platform.OS === 'android' ? t.spacing.lg : 0,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  iconBtnPlaceholder: { width: 40, height: 40 },
  topTitle: { ...t.typography.bodyStrong, color: '#fff' },

  aimWrap: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  aimBox: {
    width: 260,
    height: 180,
    position: 'relative' as const,
  },
  corner: {
    position: 'absolute' as const,
    width: 28,
    height: 28,
    borderColor: '#fff',
  },
  corner_tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  corner_tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  corner_bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  corner_br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },

  bottomBar: {
    alignItems: 'center' as const,
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.xl,
    paddingBottom: t.spacing.xl,
  },
  aimText: { ...t.typography.bodyStrong, color: '#fff', textAlign: 'center' as const },
  hintText: { ...t.typography.caption, color: 'rgba(255,255,255,0.7)', textAlign: 'center' as const },

  // Permission view
  permBg: { flex: 1, backgroundColor: t.colors.bg },
  permTop: {
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    alignItems: 'flex-start' as const,
  },
  permBody: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'stretch' as const,
    paddingHorizontal: t.spacing.xl,
    gap: t.spacing.md,
  },
  permIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: t.colors.primaryBg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    marginBottom: t.spacing.md,
  },
  permTitle: {
    ...t.typography.h2,
    color: t.colors.text,
    textAlign: 'center' as const,
  },
  permText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: t.spacing.md,
  },

  // Results
  resultsBg: { flex: 1, backgroundColor: t.colors.bg },
  resultsHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    gap: t.spacing.md,
  },
  resultsTitle: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
    flex: 1,
    textAlign: 'center' as const,
  },
  resultsList: {
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.xl,
  },
  summaryCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.md,
    padding: t.spacing.md,
    marginBottom: t.spacing.md,
    gap: 4,
  },
  summaryLabel: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  summaryProduct: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  summaryCount: {
    ...t.typography.caption,
    color: t.colors.success,
    marginTop: 2,
  },
  emptyBlock: {
    alignItems: 'center' as const,
    padding: t.spacing.xl,
    gap: t.spacing.md,
  },
  emptyText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: 'center' as const,
  },
  searchLink: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: t.spacing.sm,
  },
  searchLinkText: {
    ...t.typography.bodyStrong,
    color: t.colors.primary,
  },
  rescanBtnWrap: {
    alignSelf: 'stretch' as const,
    marginTop: t.spacing.md,
  },
});
