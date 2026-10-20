import { StorefrontAuthForm } from "@/features/auth/components/storefront-auth-form";

export default async function StorefrontLoginPage({ searchParams }: { searchParams?: Promise<{ returnTo?: string; mode?: string }> }) {
  const params = await searchParams;
  const requested = params?.returnTo ?? "/account";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/login") ? requested : "/account";

  return <main className="auth-page organic-section-3d">
    <div className="auth-backdrop" role="img" aria-label="Fresh produce from our contributors" />
    <StorefrontAuthForm returnTo={returnTo} initialMode={params?.mode === "signup" ? "signup" : "password"} />
  </main>;
}
