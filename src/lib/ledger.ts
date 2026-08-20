import { Prisma } from "@prisma/client";

type PrismaTransactionClient = Prisma.TransactionClient;

export async function getNextVoucherNumber(
  tx: PrismaTransactionClient,
  prefix: "CRV" | "BRV" | "CPV" | "BPV" | "JV" | "CV" | "EAV" | "VOUCHER"
): Promise<string> {
  const count = await tx.ledgerEntry.count({
    where: {
      voucherType: prefix,
    },
  });
  return `${prefix}-${10001 + count}`;
}

export async function recordLedgerEntry(
  tx: PrismaTransactionClient,
  data: {
    description: string;
    debitAccount: string;
    creditAccount: string;
    amount: number | Prisma.Decimal;
    referenceType: string; // "PO_RECEIPT", "INVOICE", "RETURN", "VENDOR_RETURN", "STOCK_ADJUSTMENT", "PAYROLL", "VOUCHER", "ADVANCE"
    referenceId: string;
    entryDate?: Date;
    partyType?: "CUSTOMER" | "VENDOR" | "EMPLOYEE" | "GENERAL" | string;
    partyId?: string | null;
    partyName?: string | null;
    voucherType?: "CRV" | "BRV" | "CPV" | "BPV" | "JV" | "CV" | "EAV" | string | null;
    voucherNumber?: string | null;
    paymentMethod?: "CASH" | "BANK_TRANSFER" | "CHEQUE" | "ONLINE" | string | null;
    chequeNumber?: string | null;
    notes?: string | null;
  }
) {
  return await tx.ledgerEntry.create({
    data: {
      entryDate: data.entryDate || new Date(),
      description: data.description,
      debitAccount: data.debitAccount,
      creditAccount: data.creditAccount,
      amount: data.amount,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      partyType: data.partyType || null,
      partyId: data.partyId || null,
      partyName: data.partyName || null,
      voucherType: data.voucherType || null,
      voucherNumber: data.voucherNumber || null,
      paymentMethod: data.paymentMethod || null,
      chequeNumber: data.chequeNumber || null,
      notes: data.notes || null,
    },
  });
}

export async function recordStockMovement(
  tx: PrismaTransactionClient,
  data: {
    productId: string;
    type: string; // "PO_RECEIPT", "SALE", "DO_DISPATCH", "RETURN", "VENDOR_RETURN", "MANUAL_ADJUSTMENT"
    quantity: number; // Positive for arrivals, negative for sales/dispatches
    referenceDoc: string;
  }
) {
  const product = await tx.product.findUnique({
    where: { id: data.productId },
  });

  if (!product) {
    throw new Error(`Product not found: ${data.productId}`);
  }

  // Strictly prevent stock from ever going negative
  if (data.quantity < 0 && (product.onHandQty + data.quantity < 0)) {
    throw new Error(
      `Insufficient stock for "${product.sku} - ${product.name}". Available in stock: ${Math.max(0, product.onHandQty)}, Attempted reduction: ${Math.abs(data.quantity)}.`
    );
  }

  const runningBalance = Math.max(0, product.onHandQty + data.quantity);

  await tx.product.update({
    where: { id: data.productId },
    data: {
      onHandQty: runningBalance,
    },
  });

  return await tx.stockLedger.create({
    data: {
      productId: data.productId,
      type: data.type,
      quantity: data.quantity,
      referenceDoc: data.referenceDoc,
      runningBalance: runningBalance,
    },
  });
}

export async function updateProductAverageCost(
  tx: PrismaTransactionClient,
  productId: string,
  receivedQty: number,
  unitCost: number | Prisma.Decimal
) {
  const product = await tx.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const currentOnHand = product.onHandQty;
  const currentCost = Number(product.averageCost);
  const costPerUnit = Number(unitCost);

  let newCost = currentCost;

  if (currentOnHand + receivedQty > 0) {
    newCost = (currentOnHand * currentCost + receivedQty * costPerUnit) / (currentOnHand + receivedQty);
  } else {
    newCost = costPerUnit;
  }

  // Clean decimals
  newCost = Math.round(newCost * 100) / 100;

  return await tx.product.update({
    where: { id: productId },
    data: {
      averageCost: newCost,
    },
  });
}
