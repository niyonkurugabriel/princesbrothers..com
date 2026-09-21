import { db } from "@princess-brothers/db";

export type AuditEventInput = {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  await db.auditLog.create({
    data: {
      actorId: event.actorId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      ipAddress: event.ipAddress,
      metadata: event.metadata
    }
  });
}