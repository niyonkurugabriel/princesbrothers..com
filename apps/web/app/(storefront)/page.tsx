import Link from "next/link";
import { ProductCard } from "../../components/storefront/storefront";
import { categories, getProducts } from "../../lib/storefront/data";

export default async function StorefrontPage() {
  const products = await getProducts();
  const featured = products.filter((product) => product.featured).slice(0, 3);

  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow light">A little lovely, always</p>
          <h1>Good things<br /><em>find you here.</em></h1>
          <p className="hero-description">A warm, ever-changing collection of pieces for the way you live, give and grow together.</p>
          <Link className="button button-light" href="/store/products">Explore the collection <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="hero-art" role="img" aria-label="A curated look from the Princess and Brothers collection" />
        <div className="hero-caption">01 / 04 <span>New season, new rituals</span></div>
      </section>

      <section className="intro-section content-width" id="story">
        <div className="section-kicker">01 — The edit</div>
        <div className="intro-content">
          <h2>Made for the <em>in-between</em> moments.</h2>
          <p>Princess & Brothers is a place for things that make the ordinary feel a little more yours. We work with independent makers and our own small team to bring you pieces with a point of view.</p>
          <Link className="text-link" href="/store/products">See what&apos;s new <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="category-section content-width">
        <div className="section-heading"><div><div className="section-kicker">02 — Browse by feeling</div><h2>Find your next <em>favourite.</em></h2></div><Link className="text-link desktop-only" href="/store/products">Shop everything <span aria-hidden="true">→</span></Link></div>
        <div className="category-grid">
          {categories.map((category) => <Link href={`/store/products?category=${category.slug}`} className="category-card" key={category.id}><div className="category-image" style={{ backgroundImage: `url(${category.image})` }} /><div className="category-overlay"><span>{category.name}</span><small>{category.description}</small></div></Link>)}
        </div>
      </section>

      <section className="featured-section content-width">
        <div className="section-heading"><div><div className="section-kicker">03 — The considered edit</div><h2>Currently <em>loving.</em></h2></div><Link className="text-link desktop-only" href="/store/products">View all pieces <span aria-hidden="true">→</span></Link></div>
        <div className="product-grid">{featured.map((product) => <ProductCard product={product} priority key={product.id} />)}</div>
      </section>

      <section className="contributor-section" id="contributors">
        <div className="contributor-art" />
        <div className="contributor-copy"><p className="eyebrow">For makers & finders</p><h2>Have something<br /><em>special to share?</em></h2><p>We partner with thoughtful independent contributors who make the world feel more interesting.</p><Link className="button button-navy" href="/partner">Become a contributor <span aria-hidden="true">↗</span></Link></div>
      </section>
    </main>
  );
}