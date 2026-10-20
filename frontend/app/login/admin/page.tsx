import { AdminLoginForm } from "@/features/admin/components/login-form";

export default function AdminLoginPage() {
  return <main className="admin-login-page"><div className="admin-login-card"><div className="admin-login-brand">Princess &amp; Brothers <span>Admin</span></div><p className="admin-eyebrow">Secure operations</p><h1>Welcome to <em>admin.</em></h1><p>Use your MFA-verified admin credentials to manage every product, stock level, order, partner and session.</p><AdminLoginForm /></div></main>;
}