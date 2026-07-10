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
