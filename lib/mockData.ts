import type { Deal, Source, Category } from './types';

export const mockSources: Source[] = [
  { id: 'dmx', name: 'Điện Máy Xanh', shortName: 'DMX', logoColor: '#1976D2', baseUrl: 'https://dienmayxanh.com', isFollowed: true, activeDealsCount: 142 },
  { id: 'fpt', name: 'FPT Shop', shortName: 'FPT', logoColor: '#F58220', baseUrl: 'https://fptshop.com.vn', isFollowed: true, activeDealsCount: 87 },
  { id: 'cps', name: 'CellphoneS', shortName: 'CPS', logoColor: '#E30613', baseUrl: 'https://cellphones.com.vn', isFollowed: true, activeDealsCount: 54 },
  { id: 'concung', name: 'Con Cưng', shortName: 'CC', logoColor: '#F48FB1', baseUrl: 'https://concung.com', isFollowed: false, activeDealsCount: 63 },
  { id: 'nk', name: 'Nguyễn Kim', shortName: 'NK', logoColor: '#2E7D32', baseUrl: 'https://nguyenkim.com', isFollowed: false, activeDealsCount: 41 },
];

export const mockCategories: Category[] = [
  { id: 'all', name: 'Tất cả' },
  { id: 'electronics', name: 'Điện máy' },
  { id: 'phone', name: 'Điện thoại' },
  { id: 'baby', name: 'Mẹ & bé' },
  { id: 'fashion', name: 'Thời trang' },
];

export const mockDeals: Deal[] = [
  {
    id: '1',
    title: 'Tủ lạnh Samsung Inverter 236L RT22M4033S8',
    imageUrl: null,
    productUrl: 'https://dienmayxanh.com/tu-lanh-samsung-236l',
    originalPrice: 10200000,
    salePrice: 6900000,
    discountPercent: 32,
    sourceId: 'dmx',
    sourceName: 'Điện Máy Xanh',
    category: 'electronics',
    validUntil: '2026-07-07T23:59:59Z',
    scrapedAt: '2026-07-05T09:00:00Z',
  },
  {
    id: '2',
    title: 'Bỉm Merries quần size M64',
    imageUrl: null,
    productUrl: 'https://concung.com/bim-merries-m64',
    originalPrice: 510000,
    salePrice: 380000,
    discountPercent: 25,
    sourceId: 'concung',
    sourceName: 'Con Cưng',
    category: 'baby',
    validUntil: '2026-07-06T23:59:59Z',
    scrapedAt: '2026-07-05T09:00:00Z',
  },
  {
    id: '3',
    title: 'iPhone 15 Pro 256GB Chính hãng VN/A',
    imageUrl: null,
    productUrl: 'https://fptshop.com.vn/iphone-15-pro-256gb',
    originalPrice: 27500000,
    salePrice: 22500000,
    discountPercent: 18,
    sourceId: 'fpt',
    sourceName: 'FPT Shop',
    category: 'phone',
    validUntil: '2026-07-10T23:59:59Z',
    scrapedAt: '2026-07-05T09:00:00Z',
  },
  {
    id: '4',
    title: 'Máy giặt LG Inverter 9kg FV1409S4W',
    imageUrl: null,
    productUrl: 'https://dienmayxanh.com/may-giat-lg-9kg',
    originalPrice: 11990000,
    salePrice: 8490000,
    discountPercent: 29,
    sourceId: 'dmx',
    sourceName: 'Điện Máy Xanh',
    category: 'electronics',
    validUntil: '2026-07-08T23:59:59Z',
    scrapedAt: '2026-07-05T09:00:00Z',
  },
  {
    id: '5',
    title: 'Sữa Similac 3 IQ 900g',
    imageUrl: null,
    productUrl: 'https://concung.com/sua-similac-3',
    originalPrice: 550000,
    salePrice: 429000,
    discountPercent: 22,
    sourceId: 'concung',
    sourceName: 'Con Cưng',
    category: 'baby',
    validUntil: '2026-07-09T23:59:59Z',
    scrapedAt: '2026-07-05T09:00:00Z',
  },
];

export const formatPrice = (price: number): string => {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}tr`;
  if (price >= 1_000) return `${Math.round(price / 1_000)}k`;
  return `${price}₫`;
};

export const formatFullPrice = (price: number): string => {
  return `${price.toLocaleString('vi-VN')}₫`;
};
