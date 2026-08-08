# DealMate Mobile ("Giá Tốt")

App React Native (Expo) tổng hợp khuyến mãi từ các trang TMĐT Việt Nam. Backend: `../deal-mate-backend` (Cloudflare Worker `https://dealmate-api.levietnhutit.workers.dev` + Supabase).

> LƯU Ý: `README.md` mô tả stack cũ (Expo 52 / RN 0.76, "chưa dùng flash-list/react-query/mmkv"). File này mới là hiện trạng.

## Tech stack hiện tại

- **Expo SDK 57 / React Native 0.86**, TypeScript strict, **expo-router** (file-based routing, typed routes)
- **@tanstack/react-query** — mọi data fetching qua hooks trong `lib/queries.ts`
- **@shopify/flash-list** — list dài; **react-native-mmkv** — storage (`lib/storage.ts`)
- **react-i18next** — song ngữ vi/en (`lib/locales/vi.ts`, `en.ts`)
- **react-native-google-mobile-ads** (AdMob banner + interstitial), **react-native-purchases** (RevenueCat paywall), **posthog-react-native** (analytics), **expo-notifications** (push), **expo-updates** (OTA)

## Lệnh thường dùng

```bash
npm run typecheck       # tsc --noEmit — chạy sau mỗi thay đổi
npm run ios / android   # expo run:<platform>
npm start               # expo start (dev client, KHÔNG phải Expo Go — app có native modules)
```

## Cấu trúc

```
app/                      # expo-router
├── _layout.tsx           # Root stack (providers: QueryClient, i18n, toast, splash, UpdateGate)
├── onboarding.tsx        # First launch: chọn nguồn theo dõi
├── language.tsx          # Chọn ngôn ngữ
├── paywall.tsx           # RevenueCat paywall (remove ads)
├── (tabs)/               # index (home feed), sources, saved, notifications, profile
├── deal/[id].tsx         # Chi tiết deal: biểu đồ lịch sử giá, đặt cảnh báo giá, mở shop
├── notification/[id].tsx # Deal của 1 notification gộp (GET /notifications/:id)
└── scan.tsx              # Camera scanner mã vạch → GET /barcode/:code → list deals khớp
components/               # DealCard, FilterChip, AdBanner, GradientButton, Skeleton, UpdateGate, AnimatedSplash
lib/
├── api.ts                # API client; EXPO_PUBLIC_USE_MOCK=1 → dùng mockData.ts
├── queries.ts            # react-query hooks (useDeals infinite, useDeal, useSources,
│                         #   usePriceHistory, useAlerts, useCreateAlert/useDeleteAlert)
├── savedDeals.ts         # Lưu deal + lịch sử xem (local, MMKV)
├── prefs.ts              # Followed sources/categories (local + sync backend)
├── notifications.ts      # Expo push token + lịch sử thông báo (MMKV);
│                         #   notificationTarget() = luật điều hướng khi tap:
│                         #   dealId → /deal/:id, batchId → /notification/:id, else tab Thông báo
├── purchases.ts          # RevenueCat; ads.ts (AdMob + useOpenDeal interstitial)
├── analytics.ts          # PostHog; events const — mọi event đặt tên ở đây
├── i18n.ts + locales/    # Thêm text mới = thêm key vào CẢ vi.ts VÀ en.ts, không hardcode string trong JSX
└── featureFlags.ts, device.ts, storage.ts, queryClient.ts, types.ts, mockData.ts
constants/theme.ts        # colors, spacing, radii — luôn dùng, không hardcode giá trị
plugins/withAndroidRelease.js  # Config plugin: Kotlin flag + release signing (xem dưới)
```

## Quy ước quan trọng

- **CNG/prebuild project**: `android/` và `ios/` bị gitignore, sinh ra từ `expo prebuild`. **Không bao giờ sửa tay file native** — mọi config native đi qua `app.json` hoặc config plugin trong `plugins/`.
- Version bump chỉ ở `app.json`: `version`, `android.versionCode`, `ios.buildNumber`.
- Bundle id / package: `com.giatot.tech.app` (cả 2 platform). App name hiển thị: "Giá Tốt".
- Env: các biến `EXPO_PUBLIC_*` (API URL, AdMob unit IDs, PostHog, RevenueCat keys, USE_MOCK) khai báo trong `eas.json` profile `production`. Dev fallback: API mặc định `http://localhost:3000`.
- `DEALS_PAGE_SIZE` trong `lib/api.ts` phải khớp cap phía backend.
- i18n: mọi chuỗi hiển thị qua `t('...')`; thêm key đồng thời vào `vi.ts` và `en.ts`.

## Build Android release (AAB, ký local — không dùng EAS build)

- Keystore: `credentials/upload-keystore.jks` (alias `upload`, password trong `credentials/keystore-password.txt`) — để NGOÀI `android/` nên `prebuild --clean` không xóa.
- `plugins/withAndroidRelease.js` tự inject khi prebuild: (1) Kotlin `-Xskip-metadata-version-check` (play-services-ads 25.4.0 compile bằng Kotlin 2.3 metadata, RN 0.86 pin compiler 2.1 — ĐỪNG thử `expo-build-properties` kotlinVersion, không sửa được compiler); (2) `signingConfigs.release`; (3) props `MYAPP_UPLOAD_*` vào `gradle.properties`.
- Build:
  ```bash
  npx expo prebuild -p android --clean
  cd android && ./gradlew bundleRelease --no-daemon
  # → android/app/build/outputs/bundle/release/app-release.aab
  ```
- Đừng pipe gradle qua `tail` khi kiểm tra kết quả — nó nuốt exit code; redirect ra file.

## iOS / App Store

- ascAppId `6791636799`, team `8299FD44DA` (submit config trong `eas.json`).
- Đã từng bị reject **Guideline 4.2 Minimum Functionality** (2026-07): reviewer coi app là "aggregated web content". Khi thêm tính năng, ưu tiên chức năng native sâu (price history, price alerts, so sánh giá giữa các sàn) — tránh flow chỉ "list → mở browser".
