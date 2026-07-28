# DealMate Mobile — "Giá Tốt"

App React Native (Expo) tổng hợp khuyến mãi từ ~21 trang TMĐT Việt Nam: gom deal về một feed, so sánh và theo dõi giá, cảnh báo khi giảm tới mức mong muốn.

Backend: [`../deal-mate-backend`](../deal-mate-backend) — Cloudflare Worker (`https://dealmate-api.levietnhutit.workers.dev`) + Supabase. Scraper chạy bằng GitHub Actions.

> Tài liệu cho AI agent / quy ước chi tiết: xem [CLAUDE.md](CLAUDE.md).

## Tính năng

- **Feed deal** phân trang server-side, lọc theo danh mục + nguồn, tìm kiếm không dấu
- **Quét mã vạch sản phẩm ngoài đời** bằng camera → tra tên → hiện deal khớp giữa các sàn
- **Biểu đồ lịch sử giá** trên màn chi tiết deal (data từ bảng `price_history`)
- **Cảnh báo giảm giá**: đặt giá mong muốn cho từng deal → push khi giá chạm mức (one-shot)
- **Push notification** deal hot mới + tab Thông báo (cảnh báo đang theo dõi + lịch sử đã nhận)
- **Lưu deal / lịch sử xem** (local, MMKV), **theo dõi nguồn**, chia sẻ deal
- **Song ngữ** Việt/Anh, onboarding, paywall xoá quảng cáo (RevenueCat), AdMob, PostHog analytics, OTA update (expo-updates)

## Tech stack

- **Expo SDK 57 / React Native 0.86** — luôn giữ ở bản Expo mới nhất
- **expo-router** — file-based routing, typed routes
- **@tanstack/react-query** — data fetching/cache (hooks trong `lib/queries.ts`)
- **@shopify/flash-list**, **react-native-mmkv**, **react-i18next**
- **react-native-google-mobile-ads**, **react-native-purchases** (RevenueCat), **posthog-react-native**
- **expo-notifications** (push), **expo-updates** (OTA), **expo-web-browser** (mở trang shop)
- TypeScript strict, path alias `@/*`

## Cấu trúc

```
app/                       # expo-router — folder = route
├── _layout.tsx            # Root stack + providers (react-query, i18n, toast, UpdateGate)
├── onboarding.tsx         # First launch: chọn nguồn theo dõi
├── language.tsx           # Chọn ngôn ngữ
├── paywall.tsx            # Xoá quảng cáo (RevenueCat)
├── (tabs)/                # index (feed), sources, saved, notifications, profile
└── deal/[id].tsx          # Chi tiết deal: giá, biểu đồ lịch sử, đặt cảnh báo, mở shop
components/                # DealCard, PriceHistoryChart, PriceAlertModal, AdBanner, ...
lib/                       # api, queries, notifications, purchases, ads, analytics,
                           # savedDeals, prefs, i18n + locales/, storage (MMKV), ...
constants/theme.ts         # colors / spacing / radii — không hardcode style value
plugins/withAndroidRelease.js  # Config plugin: Kotlin flag + ký release Android
credentials/               # Upload keystore (ngoài android/ để không bị prebuild xoá)
```

`android/` và `ios/` **không có trong git** — sinh bằng `npx expo prebuild`. Không sửa tay file native; mọi config qua `app.json` hoặc config plugin.

## Chạy dev

Yêu cầu: Node 20+, Xcode / Android Studio. App có native modules (AdMob, MMKV, RevenueCat...) nên **không chạy được bằng Expo Go** — phải build dev client:

```bash
npm install

# Lần đầu (hoặc sau khi thêm native module): build dev client
npm run ios        # hoặc: npm run android

# Các lần sau chỉ cần
npm start          # Metro cho dev client đã cài
```

Kiểm tra type: `npm run typecheck`.

### Env

Biến `EXPO_PUBLIC_*` production khai báo trong `eas.json` (profile `production`): API URL, AdMob unit IDs, PostHog key, RevenueCat keys...

- Dev mặc định gọi `http://localhost:3000` (chạy backend local: `cd ../deal-mate-backend && npm run dev`)
- Không có backend? `EXPO_PUBLIC_USE_MOCK=1 npm start` → dùng data giả trong `lib/mockData.ts`

## Quy ước code

- Mọi chuỗi hiển thị qua `t('...')` — thêm key vào **cả** `lib/locales/vi.ts` và `en.ts`
- Data fetching qua hooks trong `lib/queries.ts`, không `fetch` trực tiếp trong màn hình
- Style dùng token từ `constants/theme.ts`; StyleSheet đặt cuối file
- Analytics: đặt tên event trong `lib/analytics.ts` (`events`), không rải string
- Version bump chỉ trong `app.json` (`version`, `android.versionCode`, `ios.buildNumber`)

## Build release

### Android (AAB, ký local)

Keystore: `credentials/upload-keystore.jks` (password trong `credentials/keystore-password.txt`). Plugin `withAndroidRelease` tự cấu hình signing + Kotlin flag khi prebuild.

```bash
npx expo prebuild -p android --clean
cd android && ./gradlew bundleRelease --no-daemon
# → android/app/build/outputs/bundle/release/app-release.aab
```

### iOS

```bash
eas build --platform ios --profile production
eas submit --platform ios          # ascAppId đã cấu hình trong eas.json
```

### OTA update (chỉ thay đổi JS)

```bash
eas update --channel production
```

## Lưu ý App Store

App từng bị reject **Guideline 4.2 (Minimum Functionality)** vì bị coi là "aggregated web content". Định hướng: mọi tính năng mới phải là **chức năng native sâu** (lịch sử giá, cảnh báo giá, so sánh giữa các sàn...) — tránh flow chỉ "danh sách → mở browser".
