import { CartView } from "@/features/storefront/components/cart-flow";

export const metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default function CartPage() {
  return <main className="cart-page content-width"><div className="section-kicker">Your basket</div><h1>Your <em>basket.</em></h1><CartView /></main>;
}