"use client";

import { useState } from "react";
import { sendContributorMessage } from "@/app/(contributor)/actions";
import { ThemeToggle } from "@/features/storefront/components/theme-toggle";

type ContributorMessage = { id: string; body: string; createdAt: string; sender: string; senderType: "ADMIN" | "CONTRIBUTOR"; messageType: "MESSAGE" | "REPORT"; attachmentUrl: string | null; attachmentName: string | null };

export function ContributorCommunications({ messages }: { messages: ContributorMessage[] }) {
  const [messageType, setMessageType] = useState<"MESSAGE" | "REPORT">("MESSAGE");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError("");
    const formData = new FormData(form);
    formData.set("messageType", messageType);
    formData.set("attachmentUrl", attachmentUrl);
    formData.set("attachmentName", attachmentName);
    const result = await sendContributorMessage(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Message could not be sent.");
      return;
    }
    form.reset();
    setAttachmentUrl("");
    setAttachmentName("");
    setNotice(messageType === "REPORT" ? "Report sent to the admin team." : "Message sent to the admin team.");
    window.location.reload();
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    setPending(true);
    const formData = new FormData();
    formData.set("file", file);
    try {
      const response = await fetch("/api/contributor/chat-attachment", { method: "POST", body: formData });
      const result = await response.json() as { url?: string; name?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Attachment upload failed.");
      setAttachmentUrl(result.url);
      setAttachmentName(result.name ?? file.name);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Attachment upload failed.");
    } finally {
      setPending(false);
    }
  }

  return <div className="partner-dashboard-inner">
    <header className="partner-dashboard-top"><div><p className="eyebrow">Contributor workspace</p><h1>Talk to your <em>partner team.</em></h1><p className="partner-muted">Share updates, files, links, and reports with Princess & Brothers.</p></div><div className="partner-header-actions"><ThemeToggle /><div className="approved-chip"><span /> Account approved</div></div></header>
    <section className="partner-panel">
      <div className="panel-heading compact"><div><p className="eyebrow">Messages and reports</p><h2>Your conversation</h2></div></div>
      <div className="partner-chat-history" aria-live="polite">{messages.length ? messages.map((message) => <article className={`partner-admin-message ${message.senderType === "CONTRIBUTOR" ? "from-contributor" : ""}`} key={message.id}>
        <small>{message.messageType === "REPORT" ? "Report" : message.sender} · {message.createdAt}</small>
        {message.body && <p>{message.body}</p>}
        {message.attachmentUrl && <a href={message.attachmentUrl} target="_blank" rel="noreferrer">{message.attachmentName || (message.attachmentUrl.startsWith("http") ? "Open shared link" : "Open attachment")}</a>}
      </article>) : <p className="partner-muted">Your conversation with the admin team will appear here.</p>}</div>
      <form className="partner-form-grid" onSubmit={submit}>
        <label>Send as<select value={messageType} onChange={(event) => setMessageType(event.target.value as "MESSAGE" | "REPORT")}><option value="MESSAGE">Message</option><option value="REPORT">Report</option></select></label>
        <label className="wide">Message<textarea name="body" rows={4} maxLength={4000} placeholder={messageType === "REPORT" ? "Describe an issue or share a report..." : "Write to the admin team..."} /></label>
        <label>Image or document<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" disabled={pending} onChange={(event) => void upload(event.target.files?.[0])} /></label>
        <label>Or share a link<input type="url" placeholder="https://..." value={attachmentUrl.startsWith("http") ? attachmentUrl : ""} onChange={(event) => { setAttachmentUrl(event.target.value); setAttachmentName("Shared link"); }} /></label>
        {attachmentName && <p className="partner-muted wide">Attached: {attachmentName}</p>}
        {error && <p className="form-error wide" role="alert">{error}</p>}
        {notice && <p className="partner-muted wide" role="status">{notice}</p>}
        <button className="button button-navy wide" disabled={pending} type="submit">{pending ? "Sending..." : messageType === "REPORT" ? "Send report" : "Send message"}</button>
      </form>
    </section>
  </div>;
}