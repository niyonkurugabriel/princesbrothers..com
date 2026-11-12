export type ProductDemand = {
  unitsLast7: number | string | null;
  unitsLast30: number | string | null;
  createdAt: Date;
};

export function productDemandScore(product: ProductDemand) {
  return Number(product.unitsLast30 ?? 0) + Number(product.unitsLast7 ?? 0);
}

export function sortProductsByDemand<T extends ProductDemand>(products: readonly T[]): T[] {
  return [...products].sort((first, second) =>
    productDemandScore(second) - productDemandScore(first) ||
    second.createdAt.getTime() - first.createdAt.getTime()
  );
}
