import { query } from "@princess-brothers/db";
import { unstable_cache } from "next/cache";
import { convertAmount } from "@/features/payments/payment-context";
import type { PaymentCurrency } from "@/features/payments/payments";
import type { RowDataPacket } from "mysql2/promise";

export type StorefrontCategory = {
  id: string;
  name: string;
  description: string;
  image: string;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: "RWF";
  categoryId: string | null;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  stock: number;
  createdAt: number;
  featured?: boolean;
};

export type ApprovedContributor = {
  id: string;
  companyName: string;
  location: string;
  businessDetails: string;
};

const categoryPresentation: Record<string, { description: string; image: string }> = {
  fruit: { description: "Seasonal fruit, picked ripe", image: "/products/fruits.jpg" },
  vegetables: { description: "Fresh greens and garden staples", image: "/products/inyanya.jpg" },
  "roots & tubers": { description: "Earthy, nourishing harvests", image: "/products/ibirayi.jpg" },
  "beans & peas": { description: "Plant-based pantry essentials", image: "/products/amashaza.jpg" }
};

type StorefrontProductRow = RowDataPacket & {
  id: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  retailPrice: unknown;
  currency: string;
  categoryId: string;
  categoryName: string | null;
  available: number | null;
  createdAt: Date;
};

function mapStorefrontProduct(row: StorefrontProductRow): StorefrontProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    price: convertAmount(Number(row.retailPrice), row.currency as PaymentCurrency, "RWF"),
    currency: "RWF",
    categoryId: row.categoryId ?? "",
    category: row.categoryName ?? "",
    image: row.imagePath || "/products/fruits.jpg",
    rating: 0,
    reviewCount: 0,
    stock: Number(row.available ?? 0),
    createdAt: row.createdAt.getTime()
  };
}

const catalogSelect = "SELECT p.id, p.name, p.description, p.imagePath, p.retailPrice, p.currency, p.createdAt, c.id AS categoryId, c.name AS categoryName, COALESCE(i.available, 0) AS available FROM Product p LEFT JOIN ProductCategory pc ON pc.productId = p.id LEFT JOIN Category c ON c.id = pc.categoryId LEFT JOIN (SELECT productId, SUM(quantity - reserved) AS available FROM InventoryItem GROUP BY productId) i ON i.productId = p.id";

const loadProducts = unstable_cache(async (): Promise<StorefrontProduct[]> => {
  try {
    const rows = await query<StorefrontProductRow>(`${catalogSelect} WHERE p.isActive = 1 ORDER BY p.name ASC`);
    return rows.map(mapStorefrontProduct);
  } catch {
    return [];
  }
}, ["storefront-products"], { revalidate: 30, tags: ["catalog"] });

export async function getProducts(): Promise<StorefrontProduct[]> {
  if (!process.env.DATABASE_URL) return [];
  return loadProducts();
}

const loadProduct = unstable_cache(async (id: string): Promise<StorefrontProduct | undefined> => {
  try {
    const rows = await query<StorefrontProductRow>(`${catalogSelect} WHERE p.id = ? AND p.isActive = 1 LIMIT 1`, [id]);
    return rows[0] ? mapStorefrontProduct(rows[0]) : undefined;
  } catch {
    return undefined;
  }
}, ["storefront-product-by-id"], { revalidate: 30, tags: ["catalog"] });

export async function getProduct(id: string): Promise<StorefrontProduct | undefined> {
  if (!process.env.DATABASE_URL || !id) return undefined;
  return loadProduct(id);
}

const loadStorefrontCategories = unstable_cache(async (): Promise<StorefrontCategory[]> => {
  try {
    const rows = await query<RowDataPacket & { id: string; name: string }>("SELECT id, name FROM Category ORDER BY name ASC");
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      ...(categoryPresentation[row.name.toLowerCase()] ?? { description: "Fresh from our contributors", image: "/products/fruits.jpg" })
    }));
  } catch {
    return [];
  }
}, ["storefront-categories"], { revalidate: 60, tags: ["catalog"] });

export async function getStorefrontCategories(): Promise<StorefrontCategory[]> {
  if (!process.env.DATABASE_URL) return [];
  return loadStorefrontCategories();
}

const loadApprovedContributors = unstable_cache(async (): Promise<ApprovedContributor[]> => {
  try {
    return await query<ApprovedContributor & RowDataPacket>("SELECT id, companyName, location, businessDetails FROM Contributor WHERE status = 'APPROVED' ORDER BY companyName ASC");
  } catch {
    return [];
  }
}, ["approved-contributors"], { revalidate: 60, tags: ["approved-contributors"] });

export async function getApprovedContributors(): Promise<ApprovedContributor[]> {
  if (!process.env.DATABASE_URL) return [];
  return loadApprovedContributors();
}

export type TrackingOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  total: number;
  currency: string;
  placedAt: string;
  estimatedDelivery: string;
  items: { name: string; quantity: number; price: number; image: string }[];
};

export type CustomerOrder = {
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  placedAt: string;
};

export async function getCustomerOrders(customerUserId: string): Promise<CustomerOrder[]> {
  if (!process.env.DATABASE_URL || !customerUserId) return [];

  try {
    return await query<RowDataPacket & { orderNumber: string; status: string; total: number | string; currency: string; placedAt: Date | null; createdAt: Date }>(
      "SELECT o.orderNumber, o.status, o.total, o.currency, o.placedAt, o.createdAt FROM `Order` o JOIN Customer c ON c.id = o.customerId WHERE c.userId = ? ORDER BY o.createdAt DESC",
      [customerUserId]
    ).then((rows) => rows.map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase()),
      total: Number(order.total),
      currency: order.currency,
      placedAt: (order.placedAt ?? order.createdAt).toLocaleDateString("en-US", { dateStyle: "long" })
    })));
  } catch {
    return [];
  }
}

type TrackingOrderRow = RowDataPacket & {
  orderNumber: string;
  status: string;
  placedAt: Date | null;
  createdAt: Date;
  productName: string | null;
  quantity: number | null;
  unitPrice: number | string | null;
  imagePath: string | null;
  paymentStatus: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  total: number | string;
  currency: string;
};

export async function getTrackingOrder(orderNumber: string, customerUserId: string): Promise<TrackingOrder | null> {
  if (!process.env.DATABASE_URL || !customerUserId) return null;

  try {
    const rows = await query<TrackingOrderRow>("SELECT o.orderNumber, o.status, o.placedAt, o.createdAt, o.total, o.currency, (SELECT p.status FROM Payment p WHERE p.orderId = o.id ORDER BY p.createdAt DESC LIMIT 1) AS paymentStatus, (SELECT p.paymentMethod FROM Payment p WHERE p.orderId = o.id ORDER BY p.createdAt DESC LIMIT 1) AS paymentMethod, (SELECT p.gatewayTransactionId FROM Payment p WHERE p.orderId = o.id ORDER BY p.createdAt DESC LIMIT 1) AS paymentReference, oi.productName, oi.quantity, oi.unitPrice, p.imagePath FROM `Order` o JOIN Customer c ON c.id = o.customerId LEFT JOIN OrderItem oi ON oi.orderId = o.id LEFT JOIN Product p ON p.id = oi.productId WHERE o.orderNumber = ? AND c.userId = ? ORDER BY oi.id ASC", [orderNumber, customerUserId]);
    const order = rows[0];
    if (!order) return null;

    return {
      orderNumber: order.orderNumber,
      status: order.status.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase()),
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentReference: order.paymentReference,
      total: Number(order.total),
      currency: order.currency,
      placedAt: (order.placedAt ?? order.createdAt).toLocaleDateString("en-US", { dateStyle: "long" }),
      estimatedDelivery: "To be confirmed",
      items: rows.flatMap((item) => item.productName === null ? [] : [{
        name: item.productName,
        quantity: Number(item.quantity ?? 0),
        price: Number(item.unitPrice ?? 0),
        image: item.imagePath ?? ""
      }])
    };
  } catch {
    return null;
  }
}

export async function getPurchasedCategoryIds(userId: string): Promise<string[]> {
  if (!process.env.DATABASE_URL || !userId) return [];
  try {
    const rows = await query<RowDataPacket & { categoryId: string }>("SELECT pc.categoryId FROM `Order` o JOIN Customer customer ON customer.id = o.customerId JOIN OrderItem oi ON oi.orderId = o.id JOIN ProductCategory pc ON pc.productId = oi.productId WHERE customer.userId = ? AND o.status NOT IN ('CANCELLED', 'REFUNDED') GROUP BY pc.categoryId ORDER BY COUNT(*) DESC LIMIT 12", [userId]);
    return rows.map((row) => row.categoryId);
  } catch {
    return [];
  }
}