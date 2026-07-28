export type Source = {
  id: string;
  name: string;
  shortName: string;
  logoColor: string;
  baseUrl: string;
  isFollowed: boolean;
  activeDealsCount: number;
};

export type Deal = {
  id: string;
  title: string;
  imageUrl: string | null;
  productUrl: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  sourceId: string;
  sourceName: string;
  category: string;
  validUntil: string | null;
  scrapedAt: string;
};

export type Category = {
  id: string;
  name: string;
};

/** Một điểm trên biểu đồ lịch sử giá (GET /deals/:id/history). */
export type PricePoint = {
  price: number;
  recordedAt: string;
};

/** Kết quả tra barcode: tên sản phẩm (nullable) + deals khớp trong DB. */
export type BarcodeLookupResult = {
  code: string;
  productName: string | null;
  source: 'cache' | 'api' | 'miss';
  deals: Deal[];
};

/** Cảnh báo giá user đặt cho 1 deal (bảng price_alerts phía backend). */
export type PriceAlert = {
  id: string;
  dealId: string;
  targetPrice: number;
  isActive: boolean;
  notifiedAt: string | null;
  createdAt: string;
  deal: {
    id: string;
    title: string;
    imageUrl: string | null;
    salePrice: number;
    sourceId: string;
    sourceName: string;
  } | null;
};
