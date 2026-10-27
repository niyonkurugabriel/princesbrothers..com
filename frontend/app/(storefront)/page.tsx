import Link from "next/link";
import { ContributorShowcase, ProductCard } from "@/features/storefront/components/storefront";
import { ProduceGallery } from "@/features/storefront/components/produce-gallery";
import { getApprovedContributors, getProducts, getStorefrontCategories } from "@/features/storefront/server/data";
import { ContributorIcon, DriverIcon } from "@/features/storefront/components/portal-icons";
import { AnimatedIcon } from "@/features/storefront/components/animated-icon";

const coreValues = [
  "Quality and food safety",
  "Integrity and transparency",
  "Partnership and collaboration",
  "Reliability and accountability",
  "Sustainability",
  "Customer satisfaction",
  "Innovation and growth",
  "Community empowerment"
];

export const metadata = {
  title: "Fresh produce from Rwanda",
  description: "Shop seasonal fruit, vegetables and everyday staples from Princess & Brothers contributors in Rwanda.",
  alternates: {
    canonical: "/"
  }
};

export default async function StorefrontPage() {
  const [products, approvedContributors, categories] = await Promise.all([
    getProducts(),
    getApprovedContributors(),
    getStorefrontCategories()
  ]);
  const featured = products.slice(0, 3);

  return (
    <main>
      <section className="hero-section organic-section-3d">
        <ProduceGallery />
        <div className="hero-copy organic-glass-dark organic-water">
          <div className="eyebrow light hero-eyebrow"><AnimatedIcon />Organic food · grown with care</div>
          <h1>Good food,<br /><em>grown well.</em></h1>
          <p className="hero-description">Seasonal fruit, vegetables and everyday staples from contributors who care for the soil.</p>
          <div className="organic-flex organic-flex-stack-mobile hero-actions">
            <Link className="button button-light btn-3d btn-3d-green" href="/products">Shop fresh produce <span aria-hidden="true">↗</span></Link>
            <Link aria-label="Become a contributor" className="button button-light btn-3d portal-action" href="/partner"><ContributorIcon />Become a contributor <span aria-hidden="true">→</span></Link>
            <Link aria-label="Become a driver" className="button button-light btn-3d portal-action" href="/driver/login"><DriverIcon />Become a driver <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="hero-caption">Fresh from the harvest <span>Picked with care</span></div>
      </section>

      <section className="intro-section content-width" id="story">
        <div className="section-kicker">01 — From soil to table</div>
        <div className="intro-content">
          <h2>Better food, closer to <em>home.</em></h2>
          <p>Princess & Brothers brings organic produce from independent contributors to your kitchen. We choose seasonal harvests, handle them with care and make good food easier to bring to the table.</p>
          <Link className="text-link" href="/products">Meet this week&apos;s harvest <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="mission-section content-width" id="mission">
        <div className="section-kicker">02 — Our mission and vision</div>
        <div className="mission-heading">
          <h2>From trusted sources to markets worldwide.</h2>
          <p>We connect the people who grow and make food with the people and markets that need it.</p>
        </div>
        <div className="mission-cards">
          <article>
            <p className="eyebrow">Our mission</p>
            <h3>Bringing quality food closer to everyone.</h3>
            <p>We connect farmers and food manufacturers with consumers by supplying fresh, high-quality food from trusted partners. Through reliable distribution and strong partnerships, we support local producers, sustainable agriculture and better access to quality food across Rwanda and beyond.</p>
          </article>
          <article>
            <p className="eyebrow">Our vision</p>
            <h3>A trusted food supply partner, in Rwanda and worldwide.</h3>
            <p>We aspire to be a leading food distribution company recognized for quality, reliability and innovation—connecting agricultural producers and food manufacturers with markets across the region and internationally.</p>
          </article>
        </div>
        <div className="mission-values">
          <p className="section-kicker">The values behind our work</p>
          <ul>{coreValues.map((value) => <li key={value}>{value}</li>)}</ul>
        </div>
        <p className="mission-promise">Quality products. Trusted partnerships. Reliable supply. Sustainable growth.</p>
      </section>

      <section className="category-section content-width">
        <div className="section-heading"><div><div className="section-kicker">03 — Browse the harvest</div><h2>Fresh from the <em>farm.</em></h2></div><Link className="text-link desktop-only" href="/products">Shop all produce <span aria-hidden="true">→</span></Link></div>
        <div className="category-grid">
          {categories.map((category) => <Link href={`/products?category=${category.id}`} className={`category-card${category.name.toLowerCase() === "beans & peas" ? " category-card--peas" : ""}`} key={category.id}><div className="category-image" style={{ backgroundImage: `url(${category.image})` }} /><div className="category-overlay"><span>{category.name}</span><small>{category.description}</small></div></Link>)}
        </div>
      </section>

      <section className="featured-section content-width">
        <div className="section-heading"><div><div className="section-kicker">04 — In season now</div><h2>Good things to <em>eat.</em></h2></div><Link className="text-link desktop-only" href="/products">View all produce <span aria-hidden="true">→</span></Link></div>
        <div className="product-grid row g-4">{featured.map((product) => <ProductCard product={product} priority key={product.id} />)}</div>
      </section>

      <section className="contributor-section" id="contributors">
        <div className="contributor-art" />
        <ContributorShowcase contributors={approvedContributors} />
      </section>
    </main>
  );
}