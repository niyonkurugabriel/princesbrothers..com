import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/features/storefront/components/product-detail";
import { StarRating } from "@/features/storefront/components/storefront";
import { formatLocalAmount } from "@/features/payments/payment-context";
import { getProduct } from "@/features/storefront/server/data";

const getCachedProduct = cache((id: string) => getProduct(id));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getCachedProduct(id);
  return {
    ...(product && {
      title: product.name,
      description: product.description || `Shop ${product.name} from Princess & Brothers in Rwanda.`
    }),
    alternates: {
      canonical: `/products/${encodeURIComponent(id)}`
    }
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getCachedProduct(id);
  if (!product) notFound();
  return <main className="detail-page content-width"><Link className="back-link" href="/products">← Back to produce</Link><div className="detail-layout"><div className="detail-image" style={{ backgroundImage: `url(${product.image})` }} role="img" aria-label={product.name} /><div className="detail-copy"><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><div className="detail-rating"><StarRating rating={product.rating} count={product.reviewCount} /></div><p className="detail-price">{formatLocalAmount(product.price, product.currency)}</p><p className="detail-description">{product.description}</p><AddToCartButton product={product} /><p className="stock-note"><span className="stock-dot" /> {product.stock} available from the current harvest</p><div className="detail-divider" /><div className="detail-info"><div><span>From a contributor</span><p>See the product description for contributor-provided details about its origin and growing practices.</p></div><div><span>Fresh delivery</span><p>We prepare orders with care and calculate delivery at checkout for your location.</p></div></div></div></div><section className="reviews-section"><div><div className="section-kicker">Good food, grown with care</div><h2>Know what goes on <em>your table.</em></h2></div><div className="review-summary"><strong>Seasonal</strong><span>Availability follows the harvest</span></div><div className="review-grid"><blockquote>We work with contributors who prioritize healthy soil and responsible farming practices.<cite>Princess & Brothers growing partners</cite></blockquote><blockquote>Product origin and growing information are shared by the farm and updated with each seasonal harvest.<cite>From field to kitchen</cite></blockquote></div></section></main>;
}
