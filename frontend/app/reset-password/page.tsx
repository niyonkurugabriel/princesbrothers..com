import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <main className="auth-page organic-section-3d">
    <div className="auth-backdrop" role="img" aria-label="Fresh produce from our contributors" />
    <ResetPasswordForm token={params?.token ?? ""} />
  </main>;
}
