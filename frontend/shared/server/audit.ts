import { execute } from "@princess-brothers/db";

export type AuditEventInput = {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string;
  metadata?: unknown;
};

export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const { randomUUID } = await import("node:crypto");
  await execute(
    "INSERT INTO AuditLog (id, actorId, action, entityType, entityId, ipAddress, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [randomUUID(), event.actorId ?? null, event.action, event.entityType, event.entityId, event.ipAddress ?? null, event.metadata === undefined ? null : JSON.stringify(event.metadata)]
  );
}