# DealMate Mobile

Ứng dụng mobile React Native cho DealMate — trợ lý săn sale tổng hợp deal từ nhiều nguồn thương mại điện tử Việt Nam.

## Tech stack

- **Expo SDK 52+** — RN framework có sẵn build pipeline, OTA update, và nhiều native module
- **expo-router 4** — File-based routing giống Next.js (folder = route)
- **TypeScript** — strict mode
- **React Native 0.76** với new architecture bật sẵn
- **@expo/vector-icons** (Ionicons) — cho icons
- **expo-web-browser** — mở external URL cho affiliate redirect
- **AsyncStorage** — lưu preferences locally

Chưa dùng nhưng nên thêm khi cần:
- `@shopify/flash-list` — thay `FlatList` khi feed dài (~1000 items)
- `react-native-mmkv` — nhanh hơn AsyncStorage ~10x, tốt cho local cache
- `zustand` hoặc `jotai` — state management khi có nhiều global state
- `react-query` — cache/refetch cho API calls

## Cấu trúc thư mục

```
deal-mate-mobile/
├── app/                          # expo-router (file-based routing)
│   ├── _layout.tsx              # Root Stack, wrap toàn app
│   ├── onboarding.tsx           # First launch screen
│   ├── (tabs)/                  # Bottom tab group (parentheses = group, không thành route)
│   │   ├── _layout.tsx          # Tab bar config
│   │   ├── index.tsx            # Home feed (route: /)
│   │   ├── sources.tsx          # Nguồn theo dõi (/sources)
│   │   ├── saved.tsx            # Deal đã lưu (/saved)
│   │   ├── notifications.tsx    # Thông báo (/notifications)
│   │   └── profile.tsx          # Tài khoản (/profile)
│   └── deal/
│       └── [id].tsx             # Deal detail (/deal/123)
├── components/                   # Reusable UI components
│   ├── DealCard.tsx             # Card hiển thị 1 deal trong list
│   └── FilterChip.tsx           # Chip filter danh mục
├── lib/                          # Business logic
│   ├── api.ts                   # API client (có toggle USE_MOCK)
│   ├── mockData.ts              # Data giả để dev không cần backend
│   └── types.ts                 # TypeScript types (Deal, Source, Category)
├── constants/
│   └── theme.ts                 # Colors, spacing, radii, fontSize
├── assets/                       # Icons, splash images (bạn cần tự thêm)
├── app.json                     # Expo config (app name, bundle ID, plugins)
├── babel.config.js
├── package.json
├── tsconfig.json                # Có path alias @/*
└── README.md
```

## Setup lần đầu

Yêu cầu:
- **Node.js 20+** ([nvm khuyến khích](https://github.com/nvm-sh/nvm))
- **npm** hoặc **pnpm** hoặc **yarn**
- **Expo Go app** trên điện thoại (iOS/Android) để test — không cần cài Xcode/Android Studio ở giai đoạn đầu

```bash
cd deal-mate-mobile
npm install

# Chạy dev server
npm start
```

Mở app Expo Go, scan QR code trên terminal → app load luôn.

## Chạy trên simulator (nếu cần)

```bash
# iOS (cần macOS + Xcode)
npm run ios

# Android (cần Android Studio + emulator)
npm run android
```

## Assets cần thêm

Trong folder `assets/`, thêm các file sau (chưa có trong repo này):

- `icon.png` — 1024x1024 icon app
- `splash.png` — 1284x2778 splash screen
- `adaptive-icon.png` — 1024x1024 Android adaptive icon
- `favicon.png` — 32x32 (nếu build web)

Tạm thời cứ dùng ảnh placeholder cùng size, hoặc tạo bằng [icon.kitchen](https://icon.kitchen).

## Cách hoạt động

### 1. Data flow
Hiện tại `USE_MOCK = true` trong `lib/api.ts` — mọi request đều trả về từ `mockData.ts`. Khi backend deploy xong:
1. Set env `EXPO_PUBLIC_API_URL=https://api.dealmate.vn` (hoặc URL của bạn)
2. Đổi `USE_MOCK = false`

### 2. Navigation
`expo-router` map folder structure thành route:
- `app/(tabs)/index.tsx` → `/` (home)
- `app/(tabs)/sources.tsx` → `/sources`
- `app/deal/[id].tsx` → `/deal/:id` (dynamic route)

Chuyển màn: `router.push('/deal/123')` trong code.

### 3. Affiliate redirect (điểm kiếm tiền chính)
Khi user tap "Xem tại [source]" ở màn Deal Detail:
1. Hàm `buildAffiliateUrl(sourceId, url)` bọc URL với affiliate ID (hiện là stub)
2. `WebBrowser.openBrowserAsync(url)` mở trong browser in-app

**Nên làm ở backend** thay vì mobile: gọi `GET /redirect?deal_id=X` → backend build URL affiliate → 302 redirect. Lý do: đổi affiliate ID không cần ship app version mới.

## Thêm màn hình mới

Ví dụ: thêm màn "Search":

1. Tạo file `app/search.tsx` (hoặc `app/(tabs)/search.tsx` nếu muốn thành tab)
2. Export default component
3. Chuyển sang màn: `router.push('/search')`

TypeScript sẽ tự autocomplete route path vì `typedRoutes: true` trong `app.json`.

## Thêm component mới

Bỏ vào `components/`, import bằng path alias `@/components/YourComponent`.

Convention:
- Named export: `export function DealCard(...)`
- Props type ngay đầu file
- StyleSheet ở cuối
- Không dùng `React.FC`

## Common issues

**"Module not found: @/lib/api"**
→ Chạy `npm start -- --clear` để clear cache.

**Metro bundler chậm**
→ Cài `@shopify/flash-list` thay `FlatList` khi feed dài.

**Icon không hiện**
→ Chạy `npx expo install @expo/vector-icons` để install đúng version cho SDK hiện tại.

**Simulator iOS không mở**
→ Đảm bảo Xcode installed và đã accept license: `sudo xcodebuild -license accept`.

## Next steps

Prioritized todo cho phase 1:
- [ ] Kết nối backend thật (đổi `USE_MOCK = false`)
- [ ] Lưu source preference vào AsyncStorage (persist qua các session)
- [ ] Implement save deal (heart icon trên deal detail)
- [ ] Push notification via `expo-notifications` + Expo Push Service
- [ ] Search screen
- [ ] Deep linking (mở app khi tap notification)

Phase 2:
- [ ] Onboarding flow đầy đủ (3-4 steps chọn preference)
- [ ] Analytics (Amplitude, Mixpanel, hoặc PostHog)
- [ ] Sentry for crash reporting
- [ ] Dark mode
- [ ] Refactor sang FlashList cho performance

## Deploy

Khi ready launch:

```bash
# Cài EAS CLI
npm install -g eas-cli
eas login

# Build production
eas build --platform ios
eas build --platform android

# Submit to store
eas submit --platform ios
eas submit --platform android
```

Đọc thêm: https://docs.expo.dev/build/introduction/
