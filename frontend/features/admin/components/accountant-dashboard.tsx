"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createAccountantTransaction } from "@/app/(admin)/actions";
import type { AccountantTransaction } from "@/features/admin/server/data";
import { ThemeToggle } from "@/features/storefront/components/theme-toggle";

type AccountantProfile = { fullName: string; username: string };

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function csvCell(value: string) {
  const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function money(value: number) {
  return new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 2 }).format(value);
}

export function AccountantDashboard({ profile, transactions }: { profile: AccountantProfile; transactions: AccountantTransaction[] }) {
  const router = useRouter();
  const [section, setSection] = useState<"Ledger" | "Reports">("Ledger");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const reportTransactions = useMemo(() => transactions.filter((transaction) =>
    (!startDate || transaction.transactionDate >= startDate) &&
    (!endDate || transaction.transactionDate <= endDate)
  ), [transactions, startDate, endDate]);
  const totalIncome = reportTransactions.filter((transaction) => transaction.type === "INCOME").reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = reportTransactions.filter((transaction) => transaction.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0);
  const reportHasInvalidRange = Boolean(startDate && endDate && startDate > endDate);

  async function addTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const type = formData.get("type");
    if (type !== "INCOME" && type !== "EXPENSE") {
      setSaving(false);
      setError("Choose income or expense.");
      return;
    }
    const result = await createAccountantTransaction({
      type,
      category: String(formData.get("category") ?? ""),
      description: String(formData.get("description") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      transactionDate: String(formData.get("transactionDate") ?? ""),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Transaction could not be saved.");
      return;
    }
    form.reset();
    const dateField = form.elements.namedItem("transactionDate");
    if (dateField instanceof HTMLInputElement) dateField.value = localDate();
    setNotice("Transaction recorded.");
    router.refresh();
  }

  function downloadReport() {
    if (reportHasInvalidRange) return;
    const rows = [
      ["Transaction date", "Type", "Category", "Description", "Amount", "Currency"],
      ...reportTransactions.map((item) => [
        item.transactionDate,
        item.type,
        item.category,
        item.description,
        item.amount.toFixed(2),
        "RWF",
      ]),
      [],
      ["Total income", "", "", "", totalIncome.toFixed(2), "RWF"],
      ["Total expenses", "", "", "", totalExpenses.toFixed(2), "RWF"],
      ["Net", "", "", "", (totalIncome - totalExpenses).toFixed(2), "RWF"],
    ];
    const csv = rows.map((row) => row.map((value) => csvCell(String(value))).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `finance-report-${startDate || "all-time"}-to-${endDate || "all-time"}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function signOut() {
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Sign out failed.");
      router.replace("/login/admin");
      router.refresh();
    } catch {
      setError("Could not sign out. Please try again.");
    }
  }

  return <div className="admin-layout accountant-layout">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span>P&amp;B</span><b>Finance</b></div>
      <nav className="admin-nav" aria-label="Accountant navigation">
        {(["Ledger", "Reports"] as const).map((item) => <button className={section === item ? "active" : ""} key={item} type="button" onClick={() => setSection(item)}><span className="nav-dot" />{item}</button>)}
      </nav>
      <div className="admin-user"><span className="avatar">{profile.fullName.slice(0, 2).toUpperCase()}</span><div><b>{profile.fullName}</b><small>@{profile.username}</small></div><button className="admin-signout" type="button" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}>↪</button></div>
    </aside>
    <main className="admin-main">
      <header className="admin-topbar"><div><span className="admin-breadcrumb">Finance / </span><b>{section}</b></div><span className="accountant-private-label">Private accountant workspace</span><ThemeToggle /></header>
      <div className="admin-content">
        <nav className="accountant-mobile-nav" aria-label="Accountant sections">
          {(["Ledger", "Reports"] as const).map((item) => <button className={section === item ? "active" : ""} key={item} type="button" onClick={() => setSection(item)}>{item}</button>)}
        </nav>
        <div className="admin-page-heading"><p className="admin-eyebrow">Accountant / private finance records</p><h1>Income &amp; <em>expenses.</em></h1><p>Record financial transactions and generate date-range reports. Only your accountant account can access these records.</p></div>
        {error && <p className="accountant-message error" role="alert">{error}</p>}
        {notice && <p className="accountant-message" role="status">{notice}</p>}
        {section === "Ledger" ? <>
          <div className="accountant-summary">
            <article className="admin-card"><span>Income recorded</span><strong>{money(transactions.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + item.amount, 0))}</strong></article>
            <article className="admin-card"><span>Expenses recorded</span><strong>{money(transactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0))}</strong></article>
            <article className="admin-card"><span>Net total</span><strong>{money(transactions.reduce((sum, item) => sum + (item.type === "INCOME" ? item.amount : -item.amount), 0))}</strong></article>
          </div>
          <section className="admin-card accountant-entry">
            <div className="card-heading"><div><p className="admin-eyebrow">New entry</p><h2>Record a transaction</h2></div></div>
            <form className="accountant-form" onSubmit={(event) => void addTransaction(event)}>
              <label>Type<select name="type" required defaultValue="INCOME"><option value="INCOME">Income</option><option value="EXPENSE">Expense</option></select></label>
              <label>Category<input name="category" required maxLength={100} placeholder="Sales, supplies, transport…" /></label>
              <label>Amount (RWF)<input name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" required /></label>
              <label>Date<input name="transactionDate" type="date" defaultValue={localDate()} required /></label>
              <label className="accountant-description">Description<input name="description" required maxLength={1000} placeholder="Add a short note for this transaction" /></label>
              <button className="admin-primary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Record transaction"} <span>→</span></button>
            </form>
          </section>
          <section className="admin-card full-card accountant-ledger">
            <div className="card-heading"><div><p className="admin-eyebrow">Private ledger</p><h2>Transactions</h2></div><span>{transactions.length} entries</span></div>
            <div className="admin-table">
              <div className="table-head"><span>Date</span><span>Type</span><span>Category</span><span>Description</span><span>Amount</span></div>
              {transactions.map((item) => <div className="table-row" key={item.id}><span>{item.transactionDate}</span><span className={item.type === "INCOME" ? "accountant-income" : "accountant-expense"}>{item.type === "INCOME" ? "Income" : "Expense"}</span><span>{item.category}</span><span>{item.description}</span><b>{money(item.amount)}</b></div>)}
              {!transactions.length && <p className="accountant-empty">No transactions have been recorded yet.</p>}
            </div>
          </section>
        </> : <section className="admin-card accountant-report">
          <div className="card-heading"><div><p className="admin-eyebrow">Report builder</p><h2>Generate a transaction report</h2></div></div>
          <div className="accountant-form report-filters">
            <label>From date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label>To date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
            <button className="admin-primary-button" type="button" disabled={reportHasInvalidRange} onClick={downloadReport}>Download CSV report <span>↓</span></button>
          </div>
          {reportHasInvalidRange && <p className="accountant-message error" role="alert">The start date must be before or equal to the end date.</p>}
          <p className="accountant-report-count">{reportTransactions.length} transaction{reportTransactions.length === 1 ? "" : "s"} in selected period</p>
          <div className="accountant-summary">
            <article><span>Income</span><strong>{money(totalIncome)}</strong></article>
            <article><span>Expenses</span><strong>{money(totalExpenses)}</strong></article>
            <article><span>Net</span><strong>{money(totalIncome - totalExpenses)}</strong></article>
          </div>
        </section>}
      </div>
    </main>
  </div>;
}
