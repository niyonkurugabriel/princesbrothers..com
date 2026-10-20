import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

function toPaystackMinorAmount(amount: number, currency: string): number {
  const normalized = String(currency).toUpperCase();
  const zeroDecimalCurrencies = new Set([
    "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"
  ]);
  if (zeroDecimalCurrencies.has(normalized)) return Math.round(amount);
  return Math.round(amount * 100);
}

function normalizeProvider(value?: string): "MTN" | "Airtel" {
  const provider = String(value ?? "MTN").trim().toUpperCase();
  if (provider === "AIRTEL" || provider === "AIRTEL_MONEY") return "Airtel";
  return "MTN";
}

export async function POST(request: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ ok: false, error: "Paystack secret key is not configured." }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      amount?: number | string;
      currency?: string;
      reference?: string;
      provider?: string;
      phone?: string;
      callbackUrl?: string;
      channels?: string[];
      metadata?: Record<string, unknown>;
    };

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const amount = Number(body.amount ?? 0);
    const currency = (body.currency ?? "RWF").toUpperCase();
    const provider = normalizeProvider(body.provider);
    const phone = typeof body.phone === "string" ? body.phone.replace(/\s+/g, "") : "";
    const reference = typeof body.reference === "string" && body.reference.trim() ? body.reference.trim() : `momo-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const callbackUrl = body.callbackUrl ?? `${process.env.APP_URL ?? "https://www.princesbrothers.com"}/api/payment/verify/${encodeURIComponent(reference)}`;

    if (!email || !email.includes("@") || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Provide a valid email address and a positive amount." }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      email,
      amount: toPaystackMinorAmount(amount, currency),
      currency,
      reference,
      channels: Array.isArray(body.channels) && body.channels.length > 0 ? body.channels : ["mobile_money"],
      callback_url: callbackUrl,
      metadata: {
        ...(body.metadata ?? {}),
        provider,
        phone,
        channel: "mobile_money",
        paymentType: "mobile_money"
      }
    };

    if (phone) {
      payload.mobile_money = { provider, phone };
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const result = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string; access_code?: string };
    };

    if (!response.ok || !result.status || !result.data?.authorization_url) {
      return NextResponse.json(
        {
          ok: false,
          error: result.message ?? "Paystack mobile money initialization failed.",
          provider,
          reference
        },
        { status: response.ok ? 400 : response.status || 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      provider,
      providerLabel: provider === "MTN" ? "MTN Mobile Money" : "Airtel Money",
      reference: result.data.reference ?? reference,
      authorizationUrl: result.data.authorization_url,
      status: "pending",
      message: "Check your phone for the MoMo authorization prompt to approve this payment."
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Paystack initialization failed."
      },
      { status: 500 }
    );
  }
}
