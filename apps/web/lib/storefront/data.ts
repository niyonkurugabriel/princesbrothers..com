import { db } from "@princess-brothers/db";

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
};

export type StorefrontProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: "USD";
  category: string;
  categorySlug: string;
  image: string;
  rating: number;
  reviewCount: number;
  stock: number;
  featured?: boolean;
};

const categoryImages: Record<string, string> = {
  "new-arrivals": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85",
  accessories: "https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?auto=format&fit=crop&w=900&q=85",
  "home-gifts": "https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=900&q=85",
  "kids-collection": "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=900&q=85"
};

export const categories: StorefrontCategory[] = [
  { id: "cat-1", name: "New arrivals", slug: "new-arrivals", description: "Fresh pieces for right now", image: categoryImages["new-arrivals"] },
  { id: "cat-2", name: "Accessories", slug: "accessories", description: "The finishing touch", image: categoryImages.accessories },
  { id: "cat-3", name: "Home & gifts", slug: "home-gifts", description: "Small joys, thoughtfully chosen", image: categoryImages["home-gifts"] },
  { id: "cat-4", name: "Kids collection", slug: "kids-collection", description: "Made for curious little lives", image: categoryImages["kids-collection"] }
];

export const mockProducts: StorefrontProduct[] = [
  {
    id: "prod-1",
    sku: "PB-001",
    name: "The Sunday Knit Set",
    slug: "sunday-knit-set",
    description: "A soft, easy two-piece set for slow mornings and plans that turn into adventures.",
    price: 88,
    currency: "USD",
    category: "New arrivals",
    categorySlug: "new-arrivals",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
    rating: 4.9,
    reviewCount: 28,
    stock: 12,
    featured: true
  },
  {
    id: "prod-2",
    sku: "PB-002",
    name: "Marigold Carryall",
    slug: "marigold-carryall",
    description: "A structured everyday carryall with room for the essentials and a little more.",
    price: 64,
    currency: "USD",
    category: "Accessories",
    categorySlug: "accessories",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=85",
    rating: 4.8,
    reviewCount: 16,
    stock: 8,
    featured: true
  },
  {
    id: "prod-3",
    sku: "PB-003",
    name: "Sunday Market Candle",
    slug: "sunday-market-candle",
    description: "A warm blend of bergamot, cedar and something sweet from the corner bakery.",
    price: 32,
    currency: "USD",
    category: "Home & gifts",
    categorySlug: "home-gifts",
    image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1200&q=85",
    rating: 4.7,
    reviewCount: 43,
    stock: 24,
    featured: true
  },
  {
    id: "prod-4",
    sku: "PB-004",
    name: "Little Explorer Overalls",
    slug: "little-explorer-overalls",
    description: "Roomy cotton overalls made for climbing, collecting and getting gloriously messy.",
    price: 52,
    currency: "USD",
    category: "Kids collection",
    categorySlug: "kids-collection",
    image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=1200&q=85",
    rating: 4.9,
    reviewCount: 31,
    stock: 15
  },
  {
    id: "prod-5",
    sku: "PB-005",
    name: "Blue Hour Cardigan",
    slug: "blue-hour-cardigan",
    description: "A softly tailored layer in a blue that works from first coffee to last call.",
    price: 96,
    currency: "USD",
    category: "New arrivals",
    categorySlug: "new-arrivals",
    image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=85",
    rating: 4.6,
    reviewCount: 19,
    stock: 5
  },
  {
    id: "prod-6",
    sku: "PB-006",
    name: "Daisy Hair Ribbon",
    slug: "daisy-hair-ribbon",
    description: "A small, joyful detail to pull an outfit together.",
    price: 18,
    currency: "USD",
    category: "Accessories",
    categorySlug: "accessories",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85",
    rating: 4.8,
    reviewCount: 12,
    stock: 40
  }
];

type PrismaProductWithStorefrontRelations = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  retailPrice: unknown;
  currency: string;
  categories: { category: { name: string; slug: string } }[];
  inventoryItems: { quantity: number; reserved: number }[];
};

const fromPrisma = (product: PrismaProductWithStorefrontRelations): StorefrontProduct => {
  const category = product.categories[0]?.category;
  const categorySlug = category?.slug ?? "new-arrivals";
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "Thoughtfully chosen by Princess & Brothers.",
    price: Number(product.retailPrice),
    currency: product.currency === "USD" ? "USD" : "USD",
    category: category?.name ?? "New arrivals",
    categorySlug,
    image: categoryImages[categorySlug] ?? categoryImages["new-arrivals"],
    rating: 4.8,
    reviewCount: 0,
    stock: product.inventoryItems.reduce((total, item) => total + item.quantity - item.reserved, 0)
  };
};

export async function getProducts(): Promise<StorefrontProduct[]> {
  if (!process.env.DATABASE_URL) return mockProducts;

  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      include: { categories: { include: { category: true } }, inventoryItems: true },
      orderBy: { createdAt: "desc" }
    });
    return products.length ? products.map(fromPrisma) : mockProducts;
  } catch {
    return mockProducts;
  }
}

export async function getProduct(slug: string): Promise<StorefrontProduct | undefined> {
  const products = await getProducts();
  return products.find((product) => product.slug === slug);
}

export type TrackingOrder = {
  orderNumber: string;
  status: string;
  placedAt: string;
  estimatedDelivery: string;
  items: { name: string; quantity: number; price: number; image: string }[];
};

export const demoOrder: TrackingOrder = {
  orderNumber: "PB-10482",
  status: "In transit",
  placedAt: "September 12, 2026",
  estimatedDelivery: "September 16, 2026",
  items: [{ name: "The Sunday Knit Set", quantity: 1, price: 88, image: mockProducts[0].image }]
};

export async function getTrackingOrder(orderNumber: string): Promise<TrackingOrder | null> {
  if (!process.env.DATABASE_URL) {
    return orderNumber === demoOrder.orderNumber || orderNumber === "PB-10483"
      ? { ...demoOrder, orderNumber }
      : null;
  }

  try {
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: { items: { include: { product: true } } }
    });
    if (!order) return null;

    return {
      orderNumber: order.orderNumber,
      status: order.status.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase()),
      placedAt: (order.placedAt ?? order.createdAt).toLocaleDateString("en-US", { dateStyle: "long" }),
      estimatedDelivery: "To be confirmed",
      items: order.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: Number(item.unitPrice),
        image: mockProducts.find((product) => product.sku === item.sku)?.image ?? categoryImages["new-arrivals"]
      }))
    };
  } catch {
    return orderNumber === demoOrder.orderNumber || orderNumber === "PB-10483"
      ? { ...demoOrder, orderNumber }
      : null;
  }
}