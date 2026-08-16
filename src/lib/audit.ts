import prisma from "./db";

export interface AuditActor {
  id: string;
  email: string;
}

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "ROLLBACK";

/**
 * Computes a shallow/recursive diff between before and after objects.
 */
export function computeDiff(before: any, after: any): Record<string, { old: any; new: any }> {
  const diff: Record<string, { old: any; new: any }> = {};
  if (!before && !after) return diff;

  const allKeys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
  for (const key of allKeys) {
    // Skip volatile / system fields
    if (["updatedAt", "createdAt"].includes(key)) continue;

    const valBefore = before ? before[key] : undefined;
    const valAfter = after ? after[key] : undefined;

    if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
      diff[key] = { old: valBefore, new: valAfter };
    }
  }
  return diff;
}

/**
 * Records an audit snapshot for an entity change.
 */
export async function recordAuditSnapshot(params: {
  entityName: "Product" | "Invoice" | "PurchaseOrder" | "Employee" | "Complaint" | "Vendor" | "DeliveryOrder";
  entityId: string;
  action: AuditAction;
  actor: AuditActor;
  beforeState?: any;
  afterState?: any;
}) {
  try {
    const diff = computeDiff(params.beforeState, params.afterState);
    return await prisma.auditSnapshot.create({
      data: {
        entityName: params.entityName,
        entityId: params.entityId,
        action: params.action,
        actorId: params.actor.id,
        actorEmail: params.actor.email,
        beforeState: params.beforeState ? JSON.stringify(params.beforeState) : null,
        afterState: params.afterState ? JSON.stringify(params.afterState) : null,
        diff: Object.keys(diff).length > 0 ? JSON.stringify(diff) : null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit snapshot:", error);
    return null;
  }
}

/**
 * Rolls back an entity to its state before a specific snapshot was taken.
 */
export async function rollbackSnapshot(snapshotId: string, actor: AuditActor) {
  const snapshot = await prisma.auditSnapshot.findUnique({
    where: { id: snapshotId },
  });

  if (!snapshot) {
    throw new Error("Audit snapshot not found.");
  }

  if (snapshot.isRolledBack) {
    throw new Error("This snapshot has already been rolled back.");
  }

  if (!snapshot.beforeState && snapshot.action === "CREATE") {
    // Rolling back a CREATE means deleting the created record
    const entity = snapshot.entityName;
    const id = snapshot.entityId;

    await (prisma as any)[entity.charAt(0).toLowerCase() + entity.slice(1)].delete({
      where: { id },
    });

    await prisma.auditSnapshot.update({
      where: { id: snapshotId },
      data: { isRolledBack: true },
    });

    await recordAuditSnapshot({
      entityName: snapshot.entityName as any,
      entityId: id,
      action: "ROLLBACK",
      actor,
      beforeState: snapshot.afterState ? JSON.parse(snapshot.afterState) : null,
      afterState: null,
    });

    return { success: true, message: `Created ${snapshot.entityName} was removed via rollback.` };
  }

  if (!snapshot.beforeState) {
    throw new Error("No before-state captured for this snapshot. Cannot rollback.");
  }

  const beforeData = JSON.parse(snapshot.beforeState);
  const modelName = snapshot.entityName.charAt(0).toLowerCase() + snapshot.entityName.slice(1);
  const model = (prisma as any)[modelName];

  if (!model) {
    throw new Error(`Unsupported model rollback for: ${snapshot.entityName}`);
  }

  // Get current state to compute rollback diff
  const currentRecord = await model.findUnique({ where: { id: snapshot.entityId } });

  // Clean data keys for Prisma update (omit relations / nested IDs)
  const cleanData: any = {};
  const allowedKeys = Object.keys(beforeData).filter(
    (k) => !["createdAt", "updatedAt", "id", "lineItems", "attachments", "timelines", "auditLogs"].includes(k)
  );

  for (const k of allowedKeys) {
    cleanData[k] = beforeData[k];
  }

  // Execute update
  const restored = await model.upsert({
    where: { id: snapshot.entityId },
    update: cleanData,
    create: { ...cleanData, id: snapshot.entityId },
  });

  // Mark original snapshot as rolled back
  await prisma.auditSnapshot.update({
    where: { id: snapshotId },
    data: { isRolledBack: true },
  });

  // Record the rollback as an audit event
  await recordAuditSnapshot({
    entityName: snapshot.entityName as any,
    entityId: snapshot.entityId,
    action: "ROLLBACK",
    actor,
    beforeState: currentRecord,
    afterState: restored,
  });

  return { success: true, message: `Successfully rolled back ${snapshot.entityName} (${snapshot.entityId})` };
}
