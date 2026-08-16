-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "LoginActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnic" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "baseSalary" DECIMAL(14,2) NOT NULL,
    "bankDetails" TEXT NOT NULL,
    "fatherName" TEXT,
    "fatherPhone" TEXT,
    "responsiblePerson" TEXT,
    "refPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "status" TEXT NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseSalary" DECIMAL(14,2) NOT NULL,
    "allowances" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "deductions" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "netPay" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "paymentTerms" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "reorderLevel" INTEGER NOT NULL,
    "onHandQty" INTEGER NOT NULL DEFAULT 0,
    "incomingQty" INTEGER NOT NULL DEFAULT 0,
    "averageCost" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "salesPrice" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POLineItem" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POPendingItem" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityMissing" INTEGER NOT NULL,
    "quantityResolved" INTEGER NOT NULL DEFAULT 0,
    "dateFlagged" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "POPendingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceivedNote" (
    "id" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "GoodsReceivedNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GRNLineItem" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityReceived" INTEGER NOT NULL,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "poPendingItemId" TEXT,

    CONSTRAINT "GRNLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLedger" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceDoc" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runningBalance" INTEGER NOT NULL,

    CONSTRAINT "StockLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "adjustedQty" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryOrder" (
    "id" TEXT NOT NULL,
    "doNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "through" TEXT,
    "vehicle" TEXT,
    "poNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DOLineItem" (
    "id" TEXT NOT NULL,
    "doId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "salesPrice" DECIMAL(14,2) NOT NULL,
    "extraFields" TEXT,

    CONSTRAINT "DOLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientAddress" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "subjectHeading" TEXT,
    "subjectDescription" TEXT,
    "doId" TEXT,
    "isGst" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "complaintId" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "salesPrice" DECIMAL(14,2) NOT NULL,
    "extraFields" TEXT,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountPaid" DECIMAL(14,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Return" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnLineItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "invoiceLineItemId" TEXT NOT NULL,
    "productId" TEXT,
    "quantity" INTEGER NOT NULL,
    "refundPrice" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "ReturnLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "amountRefunded" DECIMAL(14,2) NOT NULL,
    "refundDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorReturn" (
    "id" TEXT NOT NULL,
    "vendorReturnNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorReturnLineItem" (
    "id" TEXT NOT NULL,
    "vendorReturnId" TEXT NOT NULL,
    "grnLineItemId" TEXT,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "VendorReturnLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "debitAccount" TEXT NOT NULL,
    "creditAccount" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "complaintNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerAddress" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "remarks" TEXT,
    "assignedTechnicianId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "amountStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintTimeline" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT NOT NULL,

    CONSTRAINT "ComplaintTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "vendorId" TEXT,
    "poId" TEXT,
    "doId" TEXT,
    "complaintId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditSnapshot" (
    "id" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "beforeState" TEXT,
    "afterState" TEXT,
    "diff" TEXT,
    "isRolledBack" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedReportTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entity" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "timeOfDay" TEXT NOT NULL DEFAULT '08:00',
    "recipientEmails" TEXT NOT NULL,
    "templateId" TEXT,
    "includeAiSummary" BOOLEAN NOT NULL DEFAULT true,
    "format" TEXT NOT NULL DEFAULT 'EXCEL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProactiveBriefing" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detailsJson" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProactiveBriefing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cnic_key" ON "Employee"("cnic");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_employeeId_month_year_key" ON "PayrollRun"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceivedNote_grnNumber_key" ON "GoodsReceivedNote"("grnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryOrder_doNumber_key" ON "DeliveryOrder"("doNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_complaintId_key" ON "Invoice"("complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "Return_returnNumber_key" ON "Return"("returnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorReturn_vendorReturnNumber_key" ON "VendorReturn"("vendorReturnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_complaintNumber_key" ON "Complaint"("complaintNumber");

-- CreateIndex
CREATE INDEX "AuditSnapshot_entityName_entityId_idx" ON "AuditSnapshot"("entityName", "entityId");

-- CreateIndex
CREATE INDEX "AuditSnapshot_actorId_idx" ON "AuditSnapshot"("actorId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginActivityLog" ADD CONSTRAINT "LoginActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POLineItem" ADD CONSTRAINT "POLineItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POLineItem" ADD CONSTRAINT "POLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POPendingItem" ADD CONSTRAINT "POPendingItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POPendingItem" ADD CONSTRAINT "POPendingItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceivedNote" ADD CONSTRAINT "GoodsReceivedNote_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceivedNote" ADD CONSTRAINT "GoodsReceivedNote_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRNLineItem" ADD CONSTRAINT "GRNLineItem_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceivedNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRNLineItem" ADD CONSTRAINT "GRNLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRNLineItem" ADD CONSTRAINT "GRNLineItem_poPendingItemId_fkey" FOREIGN KEY ("poPendingItemId") REFERENCES "POPendingItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLedger" ADD CONSTRAINT "StockLedger_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DOLineItem" ADD CONSTRAINT "DOLineItem_doId_fkey" FOREIGN KEY ("doId") REFERENCES "DeliveryOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DOLineItem" ADD CONSTRAINT "DOLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_doId_fkey" FOREIGN KEY ("doId") REFERENCES "DeliveryOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return" ADD CONSTRAINT "Return_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnLineItem" ADD CONSTRAINT "ReturnLineItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnLineItem" ADD CONSTRAINT "ReturnLineItem_invoiceLineItemId_fkey" FOREIGN KEY ("invoiceLineItemId") REFERENCES "InvoiceLineItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnLineItem" ADD CONSTRAINT "ReturnLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReturn" ADD CONSTRAINT "VendorReturn_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReturnLineItem" ADD CONSTRAINT "VendorReturnLineItem_vendorReturnId_fkey" FOREIGN KEY ("vendorReturnId") REFERENCES "VendorReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReturnLineItem" ADD CONSTRAINT "VendorReturnLineItem_grnLineItemId_fkey" FOREIGN KEY ("grnLineItemId") REFERENCES "GRNLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReturnLineItem" ADD CONSTRAINT "VendorReturnLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintTimeline" ADD CONSTRAINT "ComplaintTimeline_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintTimeline" ADD CONSTRAINT "ComplaintTimeline_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_doId_fkey" FOREIGN KEY ("doId") REFERENCES "DeliveryOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SavedReportTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

