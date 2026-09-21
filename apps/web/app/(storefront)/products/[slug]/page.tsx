import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "../../../../components/storefront/product-detail";
import { StarRating } from "../../../../components/storefront/storefront";
import { getProduct, getProducts } from "../../../../lib/storefront/data";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();
  return <main className="detail-page content-width"><Link className="back-link" href="/store/products">← Back to collection</Link><div className="detail-layout"><div className="detail-image" style={{ backgroundImage: `url(${product.image})` }} role="img" aria-label={product.name} /><div className="detail-copy"><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><div className="detail-rating"><StarRating rating={product.rating} count={product.reviewCount} /></div><p className="detail-price">${product.price.toFixed(2)}</p><p className="detail-description">{product.description}</p><AddToCartButton product={product} /><p className="stock-note"><span className="stock-dot" /> {product.stock} available · Ships in 1–2 business days</p><div className="detail-divider" /><div className="detail-info"><div><span>Details</span><p>Thoughtfully selected for quality, comfort and a little everyday magic.</p></div><div><span>Delivery</span><p>Free delivery over $75. Easy returns within 30 days.</p></div></div></div></div><section className="reviews-section"><div><div className="section-kicker">Customer notes</div><h2>Loved by <em>good people.</em></h2></div><div className="review-summary"><strong>{product.rating.toFixed(1)}</strong><StarRating rating={product.rating} /><span>Based on {product.reviewCount} reviews</span></div><div className="review-grid"><blockquote>“The kind of piece you reach for without thinking. Soft, beautifully made and exactly as pictured.”<cite>— Mia R.</cite></blockquote><blockquote>“A lovely little find. Packaging was thoughtful and delivery was quick.”<cite>— James T.</cite></blockquote></div></section></main>;
}