"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadAdminDriverMessages, sendAdminDriverMessage } from "@/app/(admin)/actions";
import { loadMyDriverMessages, sendMyDriverMessage } from "@/app/(driver)/actions";

type DriverMessage = {
  id: string;
  senderType: "ADMIN" | "DRIVER";
  senderName: string;
  body: string;
  createdAt: string;
};

export function DriverChat({ audience, driverId = "" }: { audience: "admin" | "driver"; driverId?: string }) {
  const [messages, setMessages] = useState<DriverMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const result = audience === "admin" ? await loadAdminDriverMessages(driverId) : await loadMyDriverMessages();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError("");
      setMessages(result.messages);
    } catch (loadError) {
      console.error("Driver messages could not be loaded.", loadError);
      setError("Messages could not be refreshed. Check the connection.");
    }
  }, [audience, driverId]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const history = historyRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [messages]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const result = audience === "admin"
        ? await sendAdminDriverMessage(driverId, body)
        : await sendMyDriverMessage(body);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessages((current) => [...current, result.message].slice(-100));
      setDraft("");
    } catch (sendError) {
      console.error("Driver message could not be sent.", sendError);
      setError("Message could not be sent. Check the connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return <section className="driver-chat">
    <h3>Messages</h3>
    <div className="driver-chat-history" ref={historyRef} aria-live="polite">
      {messages.length ? messages.map((message) => <article className={`driver-chat-message ${message.senderType === audience.toUpperCase() ? "mine" : ""}`} key={message.id}>
        <small>{message.senderName} · {message.createdAt}</small><p>{message.body}</p>
      </article>) : <p className="modal-muted">No messages yet. New replies appear here automatically.</p>}
    </div>
    <form onSubmit={send}>
      <label className="visually-hidden" htmlFor={`driver-chat-${audience}-${driverId || "self"}`}>Write a message</label>
      <textarea id={`driver-chat-${audience}-${driverId || "self"}`} rows={2} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message..." disabled={sending} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="admin-primary-button" type="submit" disabled={sending || !draft.trim()}>{sending ? "Sending…" : "Send message"}</button>
    </form>
  </section>;
}
