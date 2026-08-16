import { Prisma } from "@prisma/client";

type PrismaTransactionClient = Prisma.TransactionClient;

export async function recordLedgerEntry(
  tx: PrismaTransactionClient,
  data: {
    description: string;
    debitAccount: string;
    creditAccount: string;
    amount: number | Prisma.Decimal;
    referenceType: string; // "PO_RECEIPT", "INVOICE", "RETURN", "VENDOR_RETURN", "STOCK_ADJUSTMENT", "PAYROLL"
    referenceId: string;
    entryDate?: Date;
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

  const runningBalance = product.onHandQty + data.quantity;

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
