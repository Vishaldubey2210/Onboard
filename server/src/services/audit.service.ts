import prisma from '../utils/prisma';

export async function logAudit(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string
) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, details }
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit log:', err);
  }
}
