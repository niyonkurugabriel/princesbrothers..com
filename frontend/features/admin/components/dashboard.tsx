"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { convertAmount, formatLocalAmount } from "@/features/payments/payment-context";
import { advanceAdminOrder, approveAdminPayment, assignAdminDriver, createAdminAccount, createAdminProduct, deleteAdminAccount, deleteAdminRole, loadAdminPartnerMessages, mutateAdmin, reviewAdminPartner, revokeAdminSession, saveAdminRole, saveMomoPaymentCode, sendAdminPartnerMessage, toggleAdminAccount, updateAdminAccount, updateAdminProduct, updateOwnAdminProfile } from "@/app/(admin)/actions";
import type { AdminDriver, AdminOrder, AdminPartner, AdminProduct, AdminProductCategory, AdminRole, AdminSession } from "@/features/admin/server/data";
import { ThemeToggle } from "@/features/storefront/components/theme-toggle";
import { PasswordInput } from "@/features/auth/components/password-input";

type AdminUser = {
  id: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
};

type DashboardData = {
  products: AdminProduct[];
  categories: AdminProductCategory[];
  orders: AdminOrder[];
  partners: AdminPartner[];
  roles: AdminRole[];
  permissionGroups: { resource: string; permissions: string[] }[];
  auditEvents: { id: string; admin: string; action: string; entity: string; date: string }[];
  sessions: AdminSession[];
  adminUsers: AdminUser[];
  drivers: AdminDriver[];
  momoPaymentCode: string;
  currentAdmin: { id: string; username: string; fullName: string; profileImageUrl: string };
  isSuperAdmin: boolean;
};

const orderColumns: AdminOrder["status"][] = ["Pending payment", "Paid - ready to process", "Processing", "Ready for pickup", "Out for delivery", "Completed", "Cancelled", "Refunded"];

export function AdminDashboard({ data }: { data: DashboardData }) {
  const router = useRouter();
  const [section, setSection] = useState("Overview");
  const [toast, setToast] = useState("");
  const [partnerTab, setPartnerTab] = useState<AdminPartner["status"]>("PENDING");
  const [selectedPartner, setSelectedPartner] = useState<AdminPartner | null>(null);
  const [partners, setPartners] = useState(data.partners);
  const [sessions, setSessions] = useState(data.sessions);
  const [adminUsers, setAdminUsers] = useState(data.adminUsers);
  const [roles, setRoles] = useState(data.roles);
  const [momoPaymentCode, setMomoPaymentCode] = useState(data.momoPaymentCode);

  async function audit(action: string, entity: string, id: string) {
    const result = await mutateAdmin(action, entity, id);
    setToast(result.ok ? `${action} logged` : result.error ?? "Action unavailable");
    window.setTimeout(() => setToast(""), 2800);
  }

  async function reviewPartner(status: "APPROVED" | "REJECTED") {
    if (!selectedPartner) return;
    const result = await reviewAdminPartner({ id: selectedPartner.id, status, message: selectedPartnerMessage });
    if (!result.ok) {
      setToast(result.error ?? "Partner decision could not be saved");
      window.setTimeout(() => setToast(""), 3200);
      return;
    }
    setPartners((current) => current.map((partner) => partner.id === selectedPartner.id ? { ...partner, status } : partner));
    setToast(`Partner ${status.toLowerCase()} and message saved`);
    setSelectedPartnerMessage("");
    setSelectedPartner(null);
    window.setTimeout(() => setToast(""), 2800);
  }

  const [selectedPartnerMessage, setSelectedPartnerMessage] = useState("");

  async function processOrder(orderNumber: string) {
    const result = await advanceAdminOrder(orderNumber);
    setToast(result.ok ? `Order advanced to ${result.status?.replaceAll("_", " ").toLowerCase()}` : result.error ?? "Order could not be processed");
    if (result.ok) window.location.reload();
    window.setTimeout(() => setToast(""), 3200);
  }

  async function approvePayment(orderNumber: string) {
    const result = await approveAdminPayment(orderNumber);
    setToast(result.ok ? result.invoiceSent === false ? result.error ?? "Payment approved, but invoice email failed" : `Payment for ${orderNumber} approved and invoice emailed` : result.error ?? "Payment could not be approved");
    if (result.ok) window.location.reload();
    window.setTimeout(() => setToast(""), 3200);
  }

  async function assignDriver(orderNumber: string, driverId: string) {
    const result = await assignAdminDriver(orderNumber, driverId);
    setToast(result.ok ? `Driver assigned to ${orderNumber}` : result.error ?? "Driver could not be assigned");
    if (result.ok) window.location.reload();
    window.setTimeout(() => setToast(""), 3200);
  }

  async function savePaymentCode() {
    const result = await saveMomoPaymentCode(momoPaymentCode);
    setToast(result.ok ? "MoMo payment code saved" : result.error ?? "Payment code could not be saved");
    window.setTimeout(() => setToast(""), 3200);
  }

  async function saveOwnProfile(input: { username: string; fullName: string; profileImageUrl: string; currentPassword?: string; newPassword?: string }) {
    const result = await updateOwnAdminProfile(input);
    if (!result.ok) {
      setToast(result.error ?? "Your profile could not be saved.");
      window.setTimeout(() => setToast(""), 3200);
      return;
    }
    if (result.signedOut) {
      router.replace("/login/admin?returnTo=/admin/dashboard");
      return;
    }
    setToast("Profile settings saved.");
    window.setTimeout(() => setToast(""), 2800);
    router.refresh();
  }

  async function revoke(session: AdminSession) {
    const result = await revokeAdminSession(session.id);
    setToast(result.ok ? "Session revoked" : result.error ?? "Action unavailable");
    if (result.ok) setSessions((current) => current.filter((item) => item.id !== session.id));
    window.setTimeout(() => setToast(""), 2800);
  }

  async function signOutAdmin() {
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Sign out failed.");
      router.replace("/login/admin");
      router.refresh();
    } catch {
      setToast("Could not sign out. Please try again.");
      window.setTimeout(() => setToast(""), 3200);
    }
  }

  async function createAdminUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const username = String(formData.get("username") ?? "").trim();
    const fullName = String(formData.get("fullName") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const roleId = String(formData.get("roleId") ?? "");

    const result = await createAdminAccount({ username, fullName, password, confirmPassword, roleId });
    if (!result.ok || !result.adminUser) {
      setToast(result.error ?? "Unable to create admin account");
      window.setTimeout(() => setToast(""), 3200);
      return;
    }

    setAdminUsers((current) => [result.adminUser as AdminUser, ...current]);
    setToast(`Admin account "${result.adminUser.username}" created`);
    form.reset();
    window.setTimeout(() => setToast(""), 3200);
  }

  async function setAdminState(id: string, updates: { isActive?: boolean; roleId?: string }) {
    const result = await toggleAdminAccount({ id, ...updates });
    if (!result.ok || !result.adminUser) {
      setToast(result.error ?? "Unable to update admin account");
      window.setTimeout(() => setToast(""), 3200);
      return;
    }

    setAdminUsers((current) => current.map((user) => user.id === id ? (result.adminUser as AdminUser) : user));
    setToast(`Admin account ${result.adminUser.username} updated`);
    window.setTimeout(() => setToast(""), 2800);
  }

  async function removeAdmin(id: string) {
    const result = await deleteAdminAccount(id);
    setToast(result.ok ? "Admin account deleted" : result.error ?? "Unable to delete admin account");
    if (result.ok) setAdminUsers((current) => current.filter((user) => user.id !== id));
    window.setTimeout(() => setToast(""), 2800);
  }

  async function editAdmin(input: { id: string; username: string; fullName: string; password?: string }) {
    const result = await updateAdminAccount(input);
    if (!result.ok || !result.adminUser) {
      setToast(result.error ?? "Unable to update admin account");
      window.setTimeout(() => setToast(""), 3200);
      return false;
    }
    setAdminUsers((current) => current.map((user) => user.id === input.id ? { ...user, ...result.adminUser } : user));
    setToast("Admin account updated; its active sessions were signed out.");
    window.setTimeout(() => setToast(""), 3200);
    return true;
  }

  async function saveRole(role: { id?: string; name: string; description: string; permissions: string[] }) {
    const result = await saveAdminRole(role);
    setToast(result.ok ? "Role saved. Assigned admins have been signed out." : result.error ?? "Unable to save role");
    if (result.ok) window.location.reload();
    window.setTimeout(() => setToast(""), 3200);
  }

  async function removeRole(id: string) {
    const result = await deleteAdminRole(id);
    setToast(result.ok ? "Role deleted" : result.error ?? "Unable to delete role");
    if (result.ok) setRoles((current) => current.filter((role) => role.id !== id));
    window.setTimeout(() => setToast(""), 2800);
  }

  return <div className="admin-layout">
    <aside className="admin-sidebar"><div className="admin-brand"><span>P&amp;B</span><b>Admin</b></div><nav className="admin-nav">{["Overview", "Catalog & inventory", "Orders & fulfillment", "Partners", "Payment settings", "My settings", "RBAC management", "Admin users", "Audit trail"].map((item) => <button className={section === item ? "active" : ""} key={item} type="button" onClick={() => setSection(item)}><span className="nav-dot" />{item}</button>)}</nav><div className="admin-user">{data.currentAdmin.profileImageUrl ? <img className="avatar" src={data.currentAdmin.profileImageUrl} alt="" /> : <span className="avatar">{data.currentAdmin.fullName.slice(0, 2).toUpperCase()}</span>}<div><b>{data.currentAdmin.fullName}</b><small>@{data.currentAdmin.username}</small></div><button type="button" aria-label="Open my settings" title="My settings" onClick={() => setSection("My settings")}>•••</button><button className="admin-signout" type="button" aria-label="Sign out" title="Sign out" onClick={signOutAdmin}>↪</button></div></aside>
    <main className="admin-main"><header className="admin-topbar"><button className="admin-mobile-menu" type="button" aria-label="Open admin navigation">☰</button><div><span className="admin-breadcrumb">Admin / </span><b>{section}</b></div><div className="admin-top-actions"><span className="admin-live"><i /> All systems operational</span><ThemeToggle /><button type="button">◎</button></div></header>{toast && <div className="admin-toast">{toast}</div>}<div className="admin-content">
      {section === "Overview" && <Overview data={data} onSection={setSection} />}
      {section === "Catalog & inventory" && <Catalog products={data.products} categories={data.categories} />}
      {section === "Orders & fulfillment" && <Orders orders={data.orders} drivers={data.drivers} onProcess={processOrder} onApprovePayment={approvePayment} onAssignDriver={assignDriver} />}
      {section === "Partners" && <Partners partners={partners} tab={partnerTab} setTab={setPartnerTab} onSelect={setSelectedPartner} />}
      {section === "Payment settings" && <PaymentSettings code={momoPaymentCode} canEdit={data.isSuperAdmin} onChange={setMomoPaymentCode} onSave={savePaymentCode} />}
      {section === "My settings" && <AdminProfileSettings profile={data.currentAdmin} onSave={saveOwnProfile} />}
      {section === "RBAC management" && <Rbac roles={roles} permissionGroups={data.permissionGroups} onSave={saveRole} onDelete={removeRole} />}
      {section === "Admin users" && <AdminUsers users={adminUsers} roles={roles} sessions={sessions} isSuperAdmin={data.isSuperAdmin} onCreate={createAdminUser} onUpdate={setAdminState} onEdit={editAdmin} onDelete={removeAdmin} onRevoke={revoke} />}
      {section === "Audit trail" && <AuditTrail events={data.auditEvents} />}
    </div></main>{selectedPartner && <PartnerReview partner={selectedPartner} message={selectedPartnerMessage} onMessage={setSelectedPartnerMessage} onClose={() => { setSelectedPartner(null); setSelectedPartnerMessage(""); }} onReview={reviewPartner} />}</div>;
}

function AdminUsers({ users, roles, sessions, isSuperAdmin, onCreate, onUpdate, onEdit, onDelete, onRevoke }: {
  users: AdminUser[];
  roles: AdminRole[];
  sessions: AdminSession[];
  isSuperAdmin: boolean;
  onCreate: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdate: (id: string, updates: { isActive?: boolean; roleId?: string }) => void;
  onEdit: (input: { id: string; username: string; fullName: string; password?: string }) => Promise<boolean>;
  onDelete: (id: string) => void;
  onRevoke: (session: AdminSession) => void;
}) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState("");
  const filteredUsers = users.filter((user) => `${user.fullName} ${user.username}`.toLowerCase().includes(search.toLowerCase()));
  async function saveAdmin(event: React.FormEvent<HTMLFormElement>, user: AdminUser) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const saved = await onEdit({ id: user.id, username: String(form.get("username") ?? ""), fullName: String(form.get("fullName") ?? ""), ...(password ? { password } : {}) });
    if (saved) setEditingId("");
  }
  return <>
    <PageHeading eyebrow="Security / identity" title={<>Admin accounts & <em>access.</em></>} copy="Create, activate, assign roles, and manage administrator sessions." />
    <div className="admin-overview-grid lower">
      {isSuperAdmin && <section className="admin-card"><CardHeading eyebrow="Create account" title="New admin" />
        <form className="admin-users-form" onSubmit={onCreate}>
          <label>Username<input name="username" required minLength={3} maxLength={100} placeholder="admin-name" /></label>
          <label>Full name<input name="fullName" required maxLength={150} placeholder="Admin full name" /></label>
          <label>Password<PasswordInput name="password" required minLength={12} maxLength={72} autoComplete="new-password" placeholder="At least 12 characters" /></label>
          <label>Confirm password<PasswordInput name="confirmPassword" required minLength={12} maxLength={72} autoComplete="new-password" placeholder="Re-enter password" /></label>
          <label>Admin role<select name="roleId" required defaultValue=""><option value="" disabled>Select a role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
          <button className="admin-primary-button" type="submit">Create admin <span>→</span></button>
        </form>
      </section>}
      <section className="admin-card"><CardHeading eyebrow="Access" title="Assigned roles" /><div className="admin-user-policy"><ul>{roles.map((role) => <li key={role.id}><b>{role.name}</b>: {role.description || role.permissions.join(", ")}</li>)}</ul></div></section>
    </div>
    <section className="admin-card full-card admin-users-list">
      <div className="table-toolbar"><div className="admin-search">Search <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search admin accounts" aria-label="Search admin accounts" /></div><span className="admin-filter">{filteredUsers.length} admins</span></div>
      <div className="admin-table"><div className="table-head"><span>Admin</span><span>Role</span><span>Status</span><span>Created</span><span>Actions</span></div>
        {filteredUsers.map((user) => <Fragment key={user.id}><div className="table-row">
          <span>{editingId === user.id ? <form id={`edit-admin-${user.id}`} className="admin-inline-edit" onSubmit={(event) => saveAdmin(event, user)}><input name="fullName" defaultValue={user.fullName} aria-label="Admin full name" required /><input name="username" defaultValue={user.username} aria-label="Admin username" minLength={3} required /><PasswordInput name="password" minLength={12} maxLength={72} autoComplete="new-password" placeholder="New password (optional)" aria-label="New password (optional)" /></form> : <><b>{user.fullName}</b><small>@{user.username}</small></>}</span>
          <span><select aria-label={`Role for ${user.username}`} value={user.roleId} onChange={(event) => onUpdate(user.id, { roleId: event.target.value })}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></span>
          <span><em className={`admin-pill ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Active" : "Inactive"}</em></span>
          <span>{new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          <span>{editingId === user.id ? <><button className="admin-text-button" type="submit" form={`edit-admin-${user.id}`}>Save</button><button className="admin-text-button" type="button" onClick={() => setEditingId("")}>Cancel</button></> : <><button className="admin-text-button" type="button" onClick={() => setEditingId(user.id)}>Edit</button><button className="admin-text-button" type="button" onClick={() => onUpdate(user.id, { isActive: !user.isActive })}>{user.isActive ? "Deactivate" : "Activate"}</button><button className="admin-text-button danger" type="button" onClick={() => onDelete(user.id)}>Delete</button></>}</span>
        </div></Fragment>)}
      </div>
    </section>
    <Sessions sessions={sessions} onRevoke={onRevoke} />
  </>;
}


function PageHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: React.ReactNode; copy?: string; action?: React.ReactNode }) { return <div className="admin-page-heading"><div><p className="admin-eyebrow">{eyebrow}</p><h1>{title}</h1>{copy && <p>{copy}</p>}</div>{action}</div>; }

function Overview({
  data,
  onSection,
}: {
  data: DashboardData;
  onSection: (section: string) => void;
}) {
  const displayName = data.currentAdmin.fullName.trim().split(/\s+/)[0] || data.currentAdmin.username;
  const formatUsdInFrw = (amount: number) => formatLocalAmount(convertAmount(amount, "USD", "RWF"), "RWF");
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return (
    <>
      <PageHeading
        eyebrow={today}
        title={
          <>
            Good morning, <em>{displayName}.</em>
          </>
        }
        copy="Here is what is happening across the shop today."
        action={
          <button
            className="admin-primary-button"
            type="button"
            onClick={() => onSection("Catalog & inventory")}
          >
            Add product <span>+</span>
          </button>
        }
      />
      <div className="admin-metrics">
        <Metric label="GMV" value={formatUsdInFrw(18420)} change="+12.4%" />
        <Metric label="Net revenue" value={formatUsdInFrw(14936)} change="+9.8%" />
        <Metric label="Average order value" value={formatUsdInFrw(68.42)} change="+4.1%" />
        <Metric label="Conversion rate" value="3.84%" change="+0.6%" />
      </div>
      <div className="admin-overview-grid">
        <section className="admin-card revenue-card">
          <CardHeading
            eyebrow="Performance"
            title="Revenue at a glance"
            action="Last 30 days ▾"
          />
          <div className="revenue-total">
            <strong>{formatUsdInFrw(14936)}</strong>
            <span>
              Net revenue <b>+9.8%</b>
            </span>
          </div>
          <div className="revenue-chart">
            <i style={{ height: "32%" }} />
            <i style={{ height: "46%" }} />
            <i style={{ height: "39%" }} />
            <i style={{ height: "61%" }} />
            <i style={{ height: "54%" }} />
            <i style={{ height: "76%" }} />
            <i style={{ height: "68%" }} />
            <i style={{ height: "93%" }} />
            <i style={{ height: "82%" }} />
            <i style={{ height: "100%" }} />
          </div>
          <div className="chart-axis">
            <span>Aug 18</span>
            <span>Sep 01</span>
            <span>Sep 16</span>
          </div>
        </section>
        <section className="admin-card quick-card">
          <CardHeading eyebrow="Needs attention" title="The short list" />
          <button onClick={() => onSection("Partners")} type="button">
            <b>02</b>
            <span>Partner applications to review</span>
            <em>→</em>
          </button>
          <button
            onClick={() => onSection("Orders & fulfillment")}
            type="button"
          >
            <b>05</b>
            <span>Orders moving through fulfillment</span>
            <em>→</em>
          </button>
          <button
            onClick={() => onSection("Catalog & inventory")}
            type="button"
          >
            <b>03</b>
            <span>Products low on stock</span>
            <em>→</em>
          </button>
        </section>
      </div>
      <div className="admin-overview-grid lower">
        <OrdersPreview orders={data.orders} onSection={onSection} />
        <PartnersPreview partners={data.partners} onSection={onSection} />
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="admin-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>
        <b>↗ {change}</b> vs previous period
      </small>
    </div>
  );
}
function CardHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) { return <div className="card-heading"><div><p className="admin-eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && <span>{action}</span>}</div>; }
function OrdersPreview({
  orders,
  onSection,
}: {
  orders: AdminOrder[];
  onSection: (s: string) => void;
}) {
  return (
    <section className="admin-card preview-card">
      <CardHeading
        eyebrow="Fulfillment"
        title="Latest orders"
        action="View all →"
      />
      <div className="preview-list">
        {orders.slice(0, 3).map((order) => (
          <div key={order.id}>
            <b>{order.id}</b>
            <span>{order.customer}</span>
            <em
              className={`order-pill ${order.status.toLowerCase().replaceAll(" ", "-")}`}
            >
              {order.status}
            </em>
            <strong>{formatLocalAmount(order.total, "RWF")}</strong>
          </div>
        ))}
      </div>
      <button
        className="admin-text-button"
        type="button"
        onClick={() => onSection("Orders & fulfillment")}
      >
        Open fulfillment view →
      </button>
    </section>
  );
}
function PartnersPreview({
  partners,
  onSection,
}: {
  partners: AdminPartner[];
  onSection: (s: string) => void;
}) {
  return (
    <section className="admin-card preview-card">
      <CardHeading
        eyebrow="Partner community"
        title="New applications"
        action="View all →"
      />
      <div className="preview-list">
        {partners
          .filter((p) => p.status === "PENDING")
          .map((partner) => (
            <div key={partner.id}>
              <span className="partner-avatar">
                {partner.company.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <b>{partner.company}</b>
                <small>{partner.applied}</small>
              </span>
              <em className="pending-pill">Pending</em>
            </div>
          ))}
      </div>
      <button
        className="admin-text-button"
        type="button"
        onClick={() => onSection("Partners")}
      >
        Review applications →
      </button>
    </section>
  );
}

function Sessions({ sessions, onRevoke }: { sessions: AdminSession[]; onRevoke: (session: AdminSession) => void }) { return <section className="admin-card sessions-card"><CardHeading eyebrow="Security" title="Active sessions" action="Force logout is immediate" /><div className="admin-table session-table"><div className="table-head"><span>User</span><span>Portal</span><span>Last seen</span><span>Expires</span><span /></div>{sessions.map((session) => <div className="table-row" key={session.id}><span><b>{session.user}</b><small>{session.email}</small></span><span>{session.portal}</span><span>{session.lastSeen}</span><span>{session.expires}</span><button className="danger-button" type="button" onClick={() => onRevoke(session)}>Force logout</button></div>)}</div></section>; }

function Catalog({ products: initialProducts, categories }: { products: AdminProduct[]; categories: AdminProductCategory[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);

  function replaceProduct(updated: AdminProduct) {
    setProducts((current) => current.some((product) => product.id === updated.id) ? current.map((product) => product.id === updated.id ? updated : product) : [updated, ...current]);
    setSelected(null);
    setCreating(false);
  }

  return <>
    <PageHeading eyebrow="Operations / catalog" title={<>Catalog & <em>inventory.</em></>} copy="Create and edit products, inventory, and storefront visibility." action={<button className="admin-primary-button" type="button" onClick={() => setCreating(true)}>Add product <span>+</span></button>} />
    <section className="admin-card full-card">
      <div className="table-toolbar"><div className="admin-search">⌕ <input placeholder="Search products or category" aria-label="Search products" /></div><span className="admin-filter">{products.length} products</span></div>
      <div className="admin-table catalog-table">
        <div className="table-head"><span>Product</span><span>Price</span><span>Category</span><span>Availability</span><span>Stock</span><span /></div>
        {products.map((product) => <div className="table-row" key={product.id}>
          <span><b>{product.product}</b><small>{product.source}</small></span>
          <span>{formatLocalAmount(product.price, "RWF")}</span>
          <span>{product.category}</span>
          <span>{product.active ? "On storefront" : "Hidden"}</span>
          <span><i className={`stock-level ${product.stock < 15 ? "low" : ""}`} />{product.stock} units</span>
          <button className="row-menu" type="button" title={`Edit ${product.product}`} aria-label={`Edit ${product.product}`} onClick={() => setSelected(product)}>Edit</button>
        </div>)}
        {!products.length && <p className="catalog-empty">No catalog products are available. Check the MySQL connection and product records.</p>}
      </div>
    </section>
    {(selected || creating) && <ProductEditor product={selected} categories={categories} onClose={() => { setSelected(null); setCreating(false); }} onSaved={replaceProduct} />}
  </>;
}

function ProductEditor({ product, categories, onClose, onSaved }: { product: AdminProduct | null; categories: AdminProductCategory[]; onClose: () => void; onSaved: (product: AdminProduct) => void }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePath, setImagePath] = useState(product?.imagePath ?? "");

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const upload = new FormData();
      upload.set("image", file);
      const response = await fetch("/api/admin/products/image", { method: "POST", body: upload });
      const result = await response.json() as { imagePath?: string; error?: string };
      if (!response.ok || !result.imagePath) throw new Error(result.error ?? "Image upload failed.");
      setImagePath(result.imagePath);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSaving(true);
    const result = product ? await updateAdminProduct(formData) : await createAdminProduct(formData);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Product could not be saved.");
      return;
    }
    const categoryId = String(formData.get("categoryId") ?? "");
    const createdProduct = (result as { product?: { id: string } }).product;
    onSaved({
      ...(product ?? { id: "", product: "", description: "", imagePath: "", price: 0, active: false, categoryId: "", category: "Uncategorized", location: "MAIN", driver: "Unassigned", stock: 0, source: "Internal" as const }),
      id: createdProduct?.id ?? product?.id ?? "",
      product: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      imagePath,
      price: Number(formData.get("price")),
      active: formData.get("active") === "on",
      categoryId,
      category: categories.find((category) => category.id === categoryId)?.name ?? "Uncategorized",
      stock: Number(formData.get("stock"))
    });
  }

  return <div className="admin-modal-backdrop"><form className="admin-modal product-edit-modal" onSubmit={save}>
    <button className="modal-close" type="button" aria-label="Close editor" onClick={onClose}>×</button>
    <p className="admin-eyebrow">Storefront catalog</p><h2>{product ? "Edit product" : "Add product"}</h2>
    {product && <input type="hidden" name="id" value={product.id} />}
    <div className="product-edit-grid">
      <label>Product name<input name="name" required maxLength={200} defaultValue={product?.product ?? ""} /></label>
      <label>Price (FRw)<input name="price" type="number" min="0" step="1" required defaultValue={product?.price ?? ""} /></label>
      <label>Category<select name="categoryId" required defaultValue={product?.categoryId ?? ""}><option value="" disabled>Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label>On-hand stock<input name="stock" type="number" min="0" step="1" required defaultValue={product?.stock ?? 0} /></label>
      <input type="hidden" name="imagePath" value={imagePath} />
      <label className="wide">Product image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadImage(event.currentTarget.files?.[0])} disabled={uploading} />{uploading && <small>Uploading image…</small>}</label>
      {imagePath && <div className="wide"><img src={imagePath} alt="Product image preview" style={{ width: 160, height: 120, objectFit: "cover" }} /></div>}
      <label className="wide">Description<textarea name="description" rows={3} maxLength={5000} defaultValue={product?.description ?? ""} /></label>
      <label className="product-active"><input name="active" type="checkbox" defaultChecked={product?.active ?? true} /> Show this product in the storefront</label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions"><button className="reject-button" type="button" onClick={onClose}>Cancel</button><button className="admin-primary-button" type="submit" disabled={saving || uploading || categories.length === 0}>{saving ? "Saving…" : product ? "Save product" : "Create product"}</button></div>
  </form></div>;
}

function Orders({ orders, drivers, onProcess, onApprovePayment, onAssignDriver }: { orders: AdminOrder[]; drivers: AdminDriver[]; onProcess: (orderNumber: string) => void; onApprovePayment: (orderNumber: string) => void; onAssignDriver: (orderNumber: string, driverId: string) => void }) {
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [driverSearch, setDriverSearch] = useState("");
  const canAdvance: Record<AdminOrder["status"], boolean> = { "Pending payment": false, "Paid - ready to process": true, Processing: true, "Ready for pickup": false, "Out for delivery": true, Completed: false, Cancelled: false, Refunded: false };
  const candidates = selected ? drivers
    .filter((driver) => `${driver.name} ${driver.phone} ${driver.locations.join(" ")}`.toLocaleLowerCase().includes(driverSearch.trim().toLocaleLowerCase()))
    .sort((first, second) => {
      const area = selected.billingLocation.toLocaleLowerCase();
      const firstMatches = first.locations.some((location) => area === location.toLocaleLowerCase() || area.startsWith(`${location.toLocaleLowerCase()},`));
      const secondMatches = second.locations.some((location) => area === location.toLocaleLowerCase() || area.startsWith(`${location.toLocaleLowerCase()},`));
      return Number(secondMatches) - Number(firstMatches);
    }) : [];
  return <>
    <PageHeading eyebrow="Operations / fulfillment" title={<>Orders in <em>motion.</em></>} copy="Live orders from the database. Open an order to advance its fulfillment state." />
    <div className="order-pipeline">{orderColumns.map((column) => <section className="pipeline-column" key={column}><header><span>{column}</span><b>{orders.filter((order) => order.status === column).length}</b></header>{orders.filter((order) => order.status === column).map((order) => <button className="order-card" key={order.id} type="button" onClick={() => { setSelected(order); setDriverSearch(order.billingLocation); }}><div><b>{order.id}</b><span>{order.placed}</span></div><strong>{formatLocalAmount(order.total, "RWF")}</strong><p>{order.customer}</p><small>{order.driver}</small></button>)}</section>)}</div>
    {selected && <div className="admin-modal-backdrop"><div className="admin-modal order-modal"><button className="modal-close" type="button" onClick={() => setSelected(null)}>×</button><p className="admin-eyebrow">Order {selected.id}</p><h2>{selected.customer}</h2><p className="modal-muted">Current status: {selected.status}</p><p>Total: {formatLocalAmount(selected.total, "RWF")} · Driver: {selected.driver}</p><p className="modal-muted">Buyer billing location: <strong>{selected.billingLocation}</strong></p><p className="modal-muted">Payment: {selected.paymentStatus ?? "Not recorded"} · {selected.paymentMethod ?? "Unknown method"}</p>{selected.paymentReference && <p className="modal-muted">Transaction reference: {selected.paymentReference}</p>}{selected.paymentStatus === "PENDING_APPROVAL" && <button className="admin-primary-button" type="button" onClick={() => onApprovePayment(selected.id)}>Approve manual payment <span>✓</span></button>}{selected.status === "Pending payment" && selected.paymentStatus !== "PENDING_APPROVAL" && <p className="modal-muted">Payment must be completed before fulfillment can begin.</p>}{selected.status === "Ready for pickup" && <div className="admin-role-field"><label htmlFor="driver-search">Search drivers by billing location</label><input id="driver-search" value={driverSearch} onChange={(event) => setDriverSearch(event.target.value)} placeholder="Search location, driver, or phone" /><select defaultValue="" onChange={(event) => { if (event.target.value) onAssignDriver(selected.id, event.target.value); }}><option value="" disabled>Select a driver{candidates.length ? "" : " (no matches)"}</option>{candidates.map((driver) => { const area = selected.billingLocation.toLocaleLowerCase(); const matched = driver.locations.some((location) => area === location.toLocaleLowerCase() || area.startsWith(`${location.toLocaleLowerCase()},`)); return <option key={driver.id} value={driver.id}>{matched ? "Location match · " : ""}{driver.name} · {driver.phone} · {driver.locations.join(", ") || "No service locations"}</option>; })}</select>{!candidates.length && <small>No drivers match this search. Change the search or update driver service locations.</small>}</div>}<button className="admin-primary-button" type="button" disabled={!canAdvance[selected.status]} onClick={() => onProcess(selected.id)}>{selected.status === "Paid - ready to process" ? "Process order" : "Advance fulfillment"} <span>→</span></button></div></div>}
  </>;
}

function PaymentSettings({ code, canEdit, onChange, onSave }: { code: string; canEdit: boolean; onChange: (code: string) => void; onSave: () => void }) {
  return <><PageHeading eyebrow="Payments / Rwanda" title={<>MoMo payment <em>instructions.</em></>} copy="Set the company payment code shown to buyers while manual payments await review." /><section className="admin-card"><CardHeading eyebrow="Company collection" title="MTN / Airtel code" /><label className="admin-role-field">Payment code<input value={code} disabled={!canEdit} maxLength={32} inputMode="text" pattern="[0-9*#]{1,32}" onChange={(event) => onChange(event.target.value)} placeholder="e.g. *182*8*1*...#" /></label>{canEdit ? <button className="admin-primary-button" type="button" onClick={onSave}>Save payment code <span>→</span></button> : <p className="modal-muted">Only a Super admin can change the payment code.</p>}</section></>;
}

function AdminProfileSettings({ profile, onSave }: { profile: DashboardData["currentAdmin"]; onSave: (input: { username: string; fullName: string; profileImageUrl: string; currentPassword?: string; newPassword?: string }) => Promise<void> }) {
  const [username, setUsername] = useState(profile.username);
  const [fullName, setFullName] = useState(profile.fullName);
  const [profileImageUrl, setProfileImageUrl] = useState(profile.profileImageUrl);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    const form = new FormData();
    form.set("image", file);
    try {
      const response = await fetch("/api/admin/profile/image", { method: "POST", body: form });
      const result = await response.json() as { imagePath?: string; error?: string };
      if (!response.ok || !result.imagePath) throw new Error(result.error ?? "Profile image upload failed.");
      setProfileImageUrl(result.imagePath);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Profile image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ username, fullName, profileImageUrl, ...(newPassword ? { currentPassword, newPassword } : {}) });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Profile settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <PageHeading eyebrow="Admin account / profile" title={<>Your account <em>settings.</em></>} copy="Update the profile details and credentials for your admin account." />
    <form className="admin-card admin-profile-settings" onSubmit={submit}>
      <CardHeading eyebrow="Profile" title="Personal details" />
      <div className="admin-profile-avatar-row">
        {profileImageUrl ? <img className="admin-profile-avatar" src={profileImageUrl} alt="Admin profile" /> : <span className="admin-profile-avatar fallback" aria-hidden="true">{fullName.slice(0, 2).toUpperCase()}</span>}
        <label className="admin-role-field">Profile image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || saving} onChange={(event) => void uploadImage(event.target.files?.[0])} /><small>JPEG, PNG, or WebP; maximum 5 MB.</small></label>
      </div>
      <label className="admin-role-field">Full name<input autoComplete="name" maxLength={150} required value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
      <label className="admin-role-field">Username<input autoComplete="username" minLength={3} maxLength={100} required value={username} onChange={(event) => setUsername(event.target.value)} /></label>
      <fieldset className="admin-profile-password"><legend>Change password</legend><label className="admin-role-field">Current password<PasswordInput autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label className="admin-role-field">New password<PasswordInput autoComplete="new-password" minLength={12} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Leave empty to keep the current password" /></label></fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="admin-primary-button" type="submit" disabled={saving || uploading}>{saving ? "Saving..." : "Save settings"}<span>→</span></button>
    </form>
  </>;
}

function Partners({ partners, tab, setTab, onSelect }: { partners: AdminPartner[]; tab: AdminPartner["status"]; setTab: (tab: AdminPartner["status"]) => void; onSelect: (partner: AdminPartner) => void }) { const filtered = partners.filter((partner) => partner.status === tab); return <><PageHeading eyebrow="Community / partners" title={<>People who make it <em>special.</em></>} copy="Review applications and care for the partner community." /><div className="admin-tabs">{(["PENDING", "APPROVED", "REJECTED"] as const).map((item) => <button className={tab === item ? "active" : ""} type="button" key={item} onClick={() => setTab(item)}>{item[0] + item.slice(1).toLowerCase()} <b>{partners.filter((partner) => partner.status === item).length}</b></button>)}</div><section className="admin-card partner-list">{filtered.length ? filtered.map((partner) => <button className="partner-list-row" type="button" key={partner.id} onClick={() => onSelect(partner)}><span className="partner-avatar large">{partner.company.slice(0, 2).toUpperCase()}</span><span><b>{partner.company}</b><small>{partner.contact} · {partner.location}</small></span><span className="partner-date">{partner.applied}</span><span className="row-arrow">→</span></button>) : <div className="admin-empty"><span>✦</span><h2>No {tab.toLowerCase()} partners</h2><p>This list is clear for now.</p></div>}</section></>; }

function PartnerReview({ partner, message, onMessage, onClose, onReview }: { partner: AdminPartner; message: string; onMessage: (message: string) => void; onClose: () => void; onReview: (status: "APPROVED" | "REJECTED") => void }) {
  const [messages, setMessages] = useState<Array<{ id: string; body: string; sender: string; senderType: string; messageType: string; createdAt: string; attachmentUrl: string | null; attachmentName: string | null }>>([]);
  const [reply, setReply] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadAdminPartnerMessages(partner.id).then((result) => {
      if (result.ok) setMessages(result.messages);
    });
  }, [partner.id]);

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    const result = await sendAdminPartnerMessage({ contributorId: partner.id, body: reply, attachmentUrl, attachmentName });
    setSending(false);
    if (!result.ok) {
      setError(result.error ?? "Message could not be sent.");
      return;
    }
    setReply("");
    setAttachmentUrl("");
    setAttachmentName("");
    const updated = await loadAdminPartnerMessages(partner.id);
    if (updated.ok) setMessages(updated.messages);
  }

  async function uploadAttachment(file: File | undefined) {
    if (!file) return;
    setSending(true);
    setError("");
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch("/api/contributor/chat-attachment", { method: "POST", body: form });
      const result = await response.json() as { url?: string; name?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Attachment upload failed.");
      setAttachmentUrl(result.url);
      setAttachmentName(result.name ?? file.name);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Attachment upload failed.");
    } finally {
      setSending(false);
    }
  }

  return <div className="admin-modal-backdrop"><div className="admin-modal partner-modal"><button className="modal-close" type="button" onClick={onClose}>×</button><p className="admin-eyebrow">Contributor application · {partner.applied}</p><div className="modal-partner-heading"><span className="partner-avatar large">{partner.company.slice(0, 2).toUpperCase()}</span><div><h2>{partner.company}</h2><p>{partner.contact}</p></div></div><div className="application-detail-grid"><div><span>Work email</span><b>{partner.email}</b></div><div><span>Registration number</span><b>{partner.registrationNumber}</b></div><div><span>Location</span><b>{partner.location}</b></div><div><span>Status</span><b className="pending-text">{partner.status}</b></div></div><div className="application-detail-copy"><span>About the business</span><p>{partner.details}</p></div><section className="partner-chat-history"><h3>Conversation and reports</h3>{messages.map((item) => <article className="partner-admin-message" key={item.id}><small>{item.messageType === "REPORT" ? "Report · " : ""}{item.sender} · {item.createdAt}</small>{item.body && <p>{item.body}</p>}{item.attachmentUrl && <a href={item.attachmentUrl} target="_blank" rel="noreferrer">{item.attachmentName || "Open attachment"}</a>}</article>)}</section><form className="admin-role-field" onSubmit={sendReply}><label>Reply to contributor<textarea rows={3} maxLength={4000} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply..." /></label><label>Image or document<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" disabled={sending} onChange={(event) => void uploadAttachment(event.target.files?.[0])} /></label><label>Or share a link<input type="url" placeholder="https://..." value={attachmentUrl.startsWith("http") ? attachmentUrl : ""} onChange={(event) => { setAttachmentUrl(event.target.value); setAttachmentName("Shared link"); }} /></label>{attachmentName && <small>Attached: {attachmentName}</small>}{error && <p className="form-error" role="alert">{error}</p>}<button className="admin-primary-button" type="submit" disabled={sending}>{sending ? "Sending..." : "Send reply"}</button></form><label className="admin-role-field">Application decision message<textarea rows={3} maxLength={4000} value={message} onChange={(event) => onMessage(event.target.value)} placeholder="Optional message included with the decision." /></label><div className="modal-actions"><button className="reject-button" type="button" onClick={() => onReview("REJECTED")}>Reject and send</button><button className="admin-primary-button" type="button" onClick={() => onReview("APPROVED")}>Approve and send <span>→</span></button></div></div></div>;
}

function Rbac({ roles, permissionGroups, onSave, onDelete }: { roles: AdminRole[]; permissionGroups: DashboardData["permissionGroups"]; onSave: (role: { id?: string; name: string; description: string; permissions: string[] }) => void; onDelete: (id: string) => void }) {
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(roles[0] ?? null);
  const [name, setName] = useState(selectedRole?.name ?? "");
  const [description, setDescription] = useState(selectedRole?.description ?? "");
  const [permissions, setPermissions] = useState(selectedRole?.permissions ?? []);
  function selectRole(role: AdminRole | null) {
    setSelectedRole(role);
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setPermissions(role?.permissions ?? []);
  }
  return <>
    <PageHeading eyebrow="Security / access control" title={<>Roles with the <em>right reach.</em></>} copy="Create roles and persist the exact permissions available to each admin." action={<button className="admin-primary-button" type="button" onClick={() => selectRole(null)}>New role <span>+</span></button>} />
    <div className="rbac-layout">
      <section className="admin-card role-list"><CardHeading eyebrow="Roles" title="Access groups" />{roles.map((role) => <button className={selectedRole?.id === role.id ? "selected" : ""} type="button" key={role.id} onClick={() => selectRole(role)}><span><b>{role.name}</b><small>{role.members} members</small></span><span>→</span></button>)}</section>
      <section className="admin-card permission-card">
        <div className="permission-heading"><div><p className="admin-eyebrow">Permissions / {selectedRole?.name ?? "New role"}</p><h2>What can this role <em>do?</em></h2></div><div className="admin-role-actions"><button className="admin-primary-button" type="button" onClick={() => onSave({ id: selectedRole?.id, name, description, permissions })}>Save changes <span>→</span></button>{selectedRole && !selectedRole.isSystem && selectedRole.members === 0 && <button className="danger-button" type="button" onClick={() => onDelete(selectedRole.id)}>Delete role</button>}</div></div>
        <label className="admin-role-field">Role name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label>
        <label className="admin-role-field">Description<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={191} /></label>
        {permissionGroups.map((group) => <div className="permission-group" key={group.resource}><b>{group.resource}</b>{group.permissions.map((permission) => <label key={permission}><span>{permission.split(":")[1]}</span><input checked={permissions.includes(permission)} onChange={(event) => setPermissions((current) => event.target.checked ? [...current, permission] : current.filter((item) => item !== permission))} type="checkbox" /></label>)}</div>)}
      </section>
    </div>
  </>;
}

function AuditTrail({ events }: { events: DashboardData["auditEvents"] }) { const [admin, setAdmin] = useState("all"); const filtered = admin === "all" ? events : events.filter((event) => event.admin === admin); return <><PageHeading eyebrow="Security / immutable history" title={<>The <em>audit trail.</em></>} copy="Every meaningful administrative action, preserved for accountability." /><div className="audit-toolbar"><label>Admin<select value={admin} onChange={(event) => setAdmin(event.target.value)}><option value="all">All admins</option><option>Alex Morgan</option><option>Priya Shah</option></select></label><button className="admin-filter" type="button">All actions ▾</button><button className="admin-filter" type="button">Any date ▾</button></div><section className="admin-card full-card audit-list"><div className="table-head"><span>Admin</span><span>Action</span><span>Entity</span><span>Date</span></div>{filtered.map((event) => <div className="table-row" key={event.id}><span><b>{event.admin}</b></span><span>{event.action}</span><span>{event.entity}</span><span>{event.date}</span></div>)}</section></>; }