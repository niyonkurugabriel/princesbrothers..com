import { CheckoutView } from "../../../components/storefront/cart-flow";
import { getCheckoutContext } from "./actions";

export default async function CheckoutPage() {
  const context = await getCheckoutContext();
  return <main className="checkout-page content-width"><CheckoutView initialContext={context} /></main>;
}