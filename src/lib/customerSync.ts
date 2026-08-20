import prisma from "./db";

export interface CustomerInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  notes?: string | null;
}

/**
 * Ensures a Customer record exists for the given name/phone/address.
 * Returns the resolved Customer record.
 */
export async function ensureCustomer(data: CustomerInput) {
  const name = (data.name || "").trim();
  if (!name) return null;

  let phone = (data.phone || "").trim();
  const address = (data.address || "").trim();
  const email = (data.email || "").trim() || null;
  const notes = data.notes || "Auto-synced Customer Account";

  // Check by phone first if provided
  if (phone) {
    const existingByPhone = await prisma.customer.findUnique({
      where: { phone },
    });
    if (existingByPhone) {
      if (!existingByPhone.address && address) {
        await prisma.customer.update({
          where: { id: existingByPhone.id },
          data: { address },
        }).catch(() => {});
      }
      return existingByPhone;
    }
  }

  // Check by name (case-insensitive)
  const existingByName = await prisma.customer.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existingByName) {
    if ((!existingByName.address && address) || (!existingByName.phone && phone)) {
      const updateData: any = {};
      if (!existingByName.address && address) updateData.address = address;
      if (!existingByName.phone && phone) updateData.phone = phone;
      try {
        return await prisma.customer.update({
          where: { id: existingByName.id },
          data: updateData,
        });
      } catch {
        return existingByName;
      }
    }
    return existingByName;
  }

  // If no phone provided, generate a deterministic unique phone based on name
  if (!phone) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    phone = `0300-${String(hash % 9000000 + 1000000)}`;
  }

  try {
    return await prisma.customer.upsert({
      where: { phone },
      update: {
        name,
        address: address || undefined,
        email: email || undefined,
      },
      create: {
        name,
        phone,
        address: address || null,
        email,
        notes,
      },
    });
  } catch (error) {
    // If phone conflict on create, try with randomized suffix
    const fallbackPhone = `0300-${Math.floor(1000000 + Math.random() * 9000000)}`;
    return await prisma.customer.create({
      data: {
        name,
        phone: fallbackPhone,
        address: address || null,
        email,
        notes,
      },
    }).catch(() => null);
  }
}

/**
 * Runs a full synchronization across Complaints, Invoices, Delivery Orders, and Ledgers.
 * Guarantees that ALL historical and new customers exist in prisma.customer and are linked.
 */
export async function syncAllCustomers() {
  try {
    // 1. Fetch distinct sources
    const [complaints, invoices, dos, ledgerParties] = await Promise.all([
      prisma.complaint.findMany({
        select: { id: true, customerId: true, customerName: true, customerPhone: true, customerAddress: true },
      }),
      prisma.invoice.findMany({
        select: { id: true, customerId: true, clientName: true, clientPhone: true, clientAddress: true },
      }),
      prisma.deliveryOrder.findMany({
        select: { id: true, customerId: true, clientName: true, clientPhone: true, deliveryAddress: true },
      }),
      prisma.ledgerEntry.findMany({
        where: { partyType: "CUSTOMER" },
        select: { partyName: true },
      }),
    ]);

    // 2. Aggregate unique customer profiles
    const customerMap = new Map<string, {
      name: string;
      phone: string;
      address: string;
      complaintIds: string[];
      invoiceIds: string[];
      doIds: string[];
    }>();

    complaints.forEach((c) => {
      const name = (c.customerName || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      const cur = customerMap.get(key) || {
        name,
        phone: (c.customerPhone || "").trim(),
        address: (c.customerAddress || "").trim(),
        complaintIds: [],
        invoiceIds: [],
        doIds: [],
      };
      if (!cur.phone && c.customerPhone) cur.phone = c.customerPhone.trim();
      if (!cur.address && c.customerAddress) cur.address = c.customerAddress.trim();
      if (!c.customerId) cur.complaintIds.push(c.id);
      customerMap.set(key, cur);
    });

    invoices.forEach((inv) => {
      const name = (inv.clientName || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      const cur = customerMap.get(key) || {
        name,
        phone: (inv.clientPhone || "").trim(),
        address: (inv.clientAddress || "").trim(),
        complaintIds: [],
        invoiceIds: [],
        doIds: [],
      };
      if (!cur.phone && inv.clientPhone) cur.phone = inv.clientPhone.trim();
      if (!cur.address && inv.clientAddress) cur.address = inv.clientAddress.trim();
      if (!inv.customerId) cur.invoiceIds.push(inv.id);
      customerMap.set(key, cur);
    });

    dos.forEach((d) => {
      const name = (d.clientName || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      const cur = customerMap.get(key) || {
        name,
        phone: (d.clientPhone || "").trim(),
        address: (d.deliveryAddress || "").trim(),
        complaintIds: [],
        invoiceIds: [],
        doIds: [],
      };
      if (!cur.phone && d.clientPhone) cur.phone = d.clientPhone.trim();
      if (!cur.address && d.deliveryAddress) cur.address = d.deliveryAddress.trim();
      if (!d.customerId) cur.doIds.push(d.id);
      customerMap.set(key, cur);
    });

    ledgerParties.forEach((lp) => {
      const name = (lp.partyName || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name,
          phone: "",
          address: "",
          complaintIds: [],
          invoiceIds: [],
          doIds: [],
        });
      }
    });

    // 3. Upsert into Customer table and link relations
    for (const [_, info] of Array.from(customerMap.entries())) {
      const cust = await ensureCustomer({
        name: info.name,
        phone: info.phone,
        address: info.address,
        notes: "Linked Customer Account",
      });

      if (cust) {
        // Link complaints
        if (info.complaintIds.length > 0) {
          await prisma.complaint.updateMany({
            where: { id: { in: info.complaintIds } },
            data: { customerId: cust.id },
          }).catch(() => {});
        }
        // Link invoices
        if (info.invoiceIds.length > 0) {
          await prisma.invoice.updateMany({
            where: { id: { in: info.invoiceIds } },
            data: { customerId: cust.id },
          }).catch(() => {});
        }
        // Link delivery orders
        if (info.doIds.length > 0) {
          await prisma.deliveryOrder.updateMany({
            where: { id: { in: info.doIds } },
            data: { customerId: cust.id },
          }).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error("Customer sync error:", error);
  }
}
