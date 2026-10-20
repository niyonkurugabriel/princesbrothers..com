import { CheckoutView } from "@/features/storefront/components/cart-flow";
import { getCheckoutContext } from "./actions";

export default async function CheckoutPage() {
  const { context, momoPaymentCode } = await getCheckoutContext();
  return <main className="checkout-page content-width"><CheckoutView initialContext={context} momoPaymentCode={momoPaymentCode} /></main>;
}