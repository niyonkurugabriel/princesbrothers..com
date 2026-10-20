import type { PaymentCurrency, PaymentGateway } from "@/features/payments/payments";

export const CURRENCY_COOKIE = "pb_currency";
export const DEFAULT_CURRENCY: PaymentCurrency = "RWF";
export const DEFAULT_FX_RATE = 1350;
const FX_CACHE_TTL_MS = 5 * 60 * 1000;
const eastAfrica = new Set(["KE", "UG", "TZ", "BI", "SS", "ET"]);
const africa = new Set(["DZ", "AO", "BJ", "BW", "BF", "CM", "CV", "CF", "TD", "KM", "CG", "CD", "CI", "DJ", "EG", "GQ", "ER", "SZ", "GA", "GM", "GH", "GN", "GW", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SD", "TG", "TN", "ZM", "ZW"]);

export type Region = "RWANDA" | "EAST_AFRICA" | "AFRICA" | "INTERNATIONAL";
export type PaymentContext = {
  countryCode: string;
  region: Region;
  currency: PaymentCurrency;
  currencySymbol: string;
  fxRate: number;
  gateways: PaymentGateway[];
  detectedFrom: "manual" | "cloudflare" | "aws" | "country-header" | "default";
};

const symbols: Record<PaymentCurrency, string> = {
  RWF: "FRw", USD: "$", KES: "KSh", UGX: "USh", TZS: "TSh", BIF: "FBu", NGN: "₦", GHS: "GH₵", ZAR: "R", EUR: "€", GBP: "£", CAD: "CA$"
};

const defaultRates: Record<PaymentCurrency, number> = { USD: 1, RWF: 1350, KES: 129, UGX: 3700, TZS: 2500, BIF: 2900, NGN: 1600, GHS: 15, ZAR: 18, EUR: 0.92, GBP: 0.79, CAD: 1.36 };
let cachedRates: { expiresAt: number; rates: Record<PaymentCurrency, number> } | undefined;

function rates(): Record<PaymentCurrency, number> {
  if (cachedRates && cachedRates.expiresAt > Date.now()) return cachedRates.rates;
  let next = defaultRates;
  if (process.env.FX_RATES_JSON) {
    try { next = { ...defaultRates, ...(JSON.parse(process.env.FX_RATES_JSON) as Partial<Record<PaymentCurrency, number>>) }; } catch { next = defaultRates; }
  }
  cachedRates = { expiresAt: Date.now() + FX_CACHE_TTL_MS, rates: next };
  return next;
}

function countryFromRequest(request: Request): { country: string; detectedFrom: PaymentContext["detectedFrom"] } {
  const headers = request.headers;
  const cloudflare = headers.get("cf-ipcountry");
  if (cloudflare && cloudflare !== "XX") return { country: cloudflare.toUpperCase(), detectedFrom: "cloudflare" };
  const aws = headers.get("cloudfront-viewer-country");
  if (aws) return { country: aws.toUpperCase(), detectedFrom: "aws" };
  const countryHeader = headers.get("x-country-code") ?? headers.get("x-geo-country");
  if (countryHeader) return { country: countryHeader.toUpperCase(), detectedFrom: "country-header" };
  return { country: "US", detectedFrom: "default" };
}

function regionFor(country: string): Region {
  if (country === "RW") return "RWANDA";
  if (eastAfrica.has(country)) return "EAST_AFRICA";
  if (africa.has(country)) return "AFRICA";
  return "INTERNATIONAL";
}

function localCurrency(country: string, region: Region): PaymentCurrency {
  if (country === "RW") return "RWF";
  if (country === "KE") return "KES";
  if (country === "UG") return "UGX";
  if (country === "TZ") return "TZS";
  if (country === "BI") return "BIF";
  if (country === "NG") return "NGN";
  if (country === "GH") return "GHS";
  if (country === "ZA") return "ZAR";
  return DEFAULT_CURRENCY;
}

function gatewaysFor(region: Region): PaymentGateway[] {
  if (region === "RWANDA") return ["MTN_MOMO", "AIRTEL_MONEY", "PAYSTACK", "MANUAL"];
  if (region === "EAST_AFRICA") return ["MPESA", "AIRTEL_MONEY", "PAYSTACK", "MANUAL"];
  if (region === "AFRICA") return ["PAYSTACK", "MANUAL"];
  return ["PAYSTACK", "MANUAL"];
}

export function convertAmount(amount: number, from: PaymentCurrency, to: PaymentCurrency): number {
  const fx = rates();
  return Number(((amount / fx[from]) * fx[to]).toFixed(2));
}

export function formatLocalAmount(amount: number, currency: PaymentCurrency): string {
  return new Intl.NumberFormat("en", { style: "currency", currency: currency === "RWF" ? "RWF" : currency, maximumFractionDigits: currency === "RWF" || currency === "UGX" ? 0 : 2 }).format(amount).replace("RWF", "FRw");
}

export function formatDefaultAmount(amount: number): string {
  return formatLocalAmount(amount, DEFAULT_CURRENCY);
}

export function resolvePaymentContext(request: Request): PaymentContext {
  const detected = countryFromRequest(request);
  const region = regionFor(detected.country);
  const cookieCurrency = request.headers.get("cookie")?.match(/(?:^|;\s*)pb_currency=([^;]+)/)?.[1];
  const requestedCurrency = (request.headers.get("x-pb-currency") ?? cookieCurrency) as PaymentCurrency | null;
  const currency = requestedCurrency && requestedCurrency in symbols ? requestedCurrency : localCurrency(detected.country, region);
  const fx = rates();
  return { countryCode: detected.country, region, currency, currencySymbol: symbols[currency], fxRate: fx[currency] / fx.RWF, gateways: gatewaysFor(region), detectedFrom: requestedCurrency ? "manual" : detected.detectedFrom };
}