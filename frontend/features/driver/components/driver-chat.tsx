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

export function DriverChat({
  audience,
  driverId = "",
  orderNumber,
  isOrderDelivered = false,
}: {
  audience: "admin" | "driver";
  driverId?: string;
  orderNumber: string;
  isOrderDelivered?: boolean;
}) {
  const [messages, setMessages] = useState<DriverMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [chatClosed, setChatClosed] = useState(isOrderDelivered);
  const historyRef = useRef<HTMLDivElement>(null);
  const deliveredRef = useRef(isOrderDelivered);

  const closeChat = useCallback(() => {
    deliveredRef.current = true;
    setChatClosed(true);
    setMessages([]);
    setDraft("");
    setError("");
  }, []);

  const refresh = useCallback(async () => {
    if (deliveredRef.current) {
      setMessages([]);
      return;
    }
    try {
      const result = audience === "admin"
        ? await loadAdminDriverMessages(driverId, orderNumber)
        : await loadMyDriverMessages(orderNumber);
      if (deliveredRef.current) {
        setMessages([]);
        return;
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.isOrderDelivered) {
        closeChat();
        return;
      }
      setError("");
      setMessages(result.messages);
    } catch (loadError) {
      console.error("Driver messages could not be loaded.", loadError);
      setError("Messages could not be refreshed. Check the connection.");
    }
  }, [audience, closeChat, driverId, orderNumber]);

  useEffect(() => {
    setMessages([]);
    setDraft("");
    setError("");
    if (isOrderDelivered) closeChat();
    else {
      deliveredRef.current = false;
      setChatClosed(false);
    }
  }, [closeChat, isOrderDelivered, orderNumber]);

  useEffect(() => {
    if (chatClosed) return;
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [chatClosed, refresh]);

  useEffect(() => {
    const history = historyRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [messages]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || deliveredRef.current) return;
    setSending(true);
    setError("");
    try {
      const result = audience === "admin"
        ? await sendAdminDriverMessage(driverId, orderNumber, body)
        : await sendMyDriverMessage(orderNumber, body);
      if (deliveredRef.current) {
        setMessages([]);
        return;
      }
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
    <header className="driver-chat-header">
      <span className="driver-chat-avatar" aria-hidden="true">P&amp;B</span>
      <div className="driver-chat-heading">
        <h3>Order chat</h3>
        <span>{orderNumber} · {chatClosed ? "Chat cleared" : "Delivery updates"}</span>
      </div>
      <span className={`driver-chat-presence${chatClosed ? " closed" : ""}`} aria-label={chatClosed ? "Chat closed" : "Chat open"} />
    </header>
    <div className="driver-chat-history" ref={historyRef} aria-live="polite">
      {messages.length ? messages.map((message) => <article className={`driver-chat-message ${message.senderType === audience.toUpperCase() ? "mine" : ""}`} key={message.id}>
        <small><span>{message.senderName}</span><time>{message.createdAt}</time></small>
        <p>{message.body}</p>
      </article>) : <p className="driver-chat-empty">{chatClosed ? "Delivery complete. This order's chat has been cleared." : "No messages yet. Start the conversation."}</p>}
    </div>
    {chatClosed
      ? <p className="driver-chat-closed">This chat closed when the order was delivered.</p>
      : <form onSubmit={send}>
        <label className="visually-hidden" htmlFor={`driver-chat-${audience}-${driverId || "self"}-${orderNumber}`}>Write a message</label>
        <textarea id={`driver-chat-${audience}-${driverId || "self"}-${orderNumber}`} rows={1} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message..." disabled={sending} />
        <button className="driver-chat-send" type="submit" aria-label="Send message" disabled={sending || !draft.trim()}>{sending ? "…" : "➤"}</button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>}
  </section>;
}
